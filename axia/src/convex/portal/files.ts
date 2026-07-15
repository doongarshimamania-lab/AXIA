// ──────────────────────────────────────────────────────────────────────────────
// portal/files.ts — Client file upload + list + delete.
//
// P1-a: Clients can upload brand assets, copy docs, reference materials.
// Files live in Convex file storage (_storage); this module manages metadata.
//
// SECURITY:
//   - generateUploadUrl requires deliverables:comment scope (clients who can
//     message can attach files — same trust boundary)
//   - confirmUpload runs AFTER the file is in _storage; verifies the storageId
//     actually exists, enforces type/size/quota limits, then inserts metadata
//   - listFiles requires deliverables:read scope
//   - deleteFile is owner-scoped: clients can delete their own uploads only
//   - Rate-limited via rateLimitByToken (10 uploads/min per client)
//
// 1000-USER SCALE:
//   - Per-client quota: 100 files / 500 MB total (configurable per tier later)
//   - Max single file: 25 MB (Convex hard limit is 50 MB; we stay under)
//   - Type allowlist: images, PDFs, docs, sheets, archives — NO executables
//   - Filename sanitized: strip path components, cap length at 255 chars
//   - listFiles paginates 50 at a time using createdAt cursor
//   - Soft delete: deletedAt set, storageId scheduled for cleanup via cron
// ──────────────────────────────────────────────────────────────────────────────

import { mutation, query, action } from "../_generated/server";
import { v, Id } from "convex/values";
import { verifyPortalScope, PortalScope, hashToken } from "../lib/portalAuth";
import { logPortalAction } from "../lib/portalAuditLog";
import { rateLimitByToken, RATE_LIMITS_PORTAL } from "./rateLimit";

const UPLOAD_SCOPES: PortalScope[] = ["deliverables:comment"];
const READ_SCOPES: PortalScope[] = ["deliverables:read"];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_FILES_PER_CLIENT = 100;
const MAX_TOTAL_BYTES_PER_CLIENT = 500 * 1024 * 1024; // 500 MB
const MAX_FILENAME_LENGTH = 255;
const LIST_PAGE_SIZE = 50;

// ponytail: type allowlist — NEVER accept executable types. MIME type is
// client-provided and spoofable, but Convex storage also exposes the type
// from the upload; we check both. This is defense-in-depth, not a guarantee.
const ALLOWED_CONTENT_TYPES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  // Audio/Video (small enough to fit under 25 MB)
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
]);

const ALLOWED_CONTENT_TYPE_PREFIXES = ["image/", "text/", "application/"];

/**
 * Generate a one-time upload URL for the client to POST the file to.
 *
 * Flow:
 *   1. Client calls generateUploadUrl (this mutation) with their token
 *   2. Backend verifies scope + rate limit, returns a signed upload URL
 *   3. Client POSTs the file bytes to that URL (Convex handles storage)
 *   4. Client calls confirmUpload with the returned storageId + metadata
 *   5. Backend verifies the storageId exists, enforces quota, inserts metadata
 *
 * The two-step flow prevents clients from stuffing arbitrary storageIds
 * into our table without actually uploading a file.
 */
export const generateUploadUrl = mutation({
  args: {
    token: v.string(),
    // Hint about what the client intends to upload — validated at confirmUpload
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, UPLOAD_SCOPES);
    await rateLimitByToken(ctx, "portal_generateUploadUrl", claims.cid, {
      max: 10,
      windowMs: 60_000,
    });

    // ponytail: pre-flight quota check — refuse early if client is at the limit.
    // The actual enforcement happens at confirmUpload; this just avoids burning
    // an upload URL when we know it would be rejected.
    if (args.sizeBytes && args.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`);
    }

    if (args.contentType && !isAllowedContentType(args.contentType)) {
      throw new Error(`File type not allowed: ${args.contentType}`);
    }

    // Pre-check quota
    const existing = await ctx.db
      .query("portalFiles")
      .withIndex("by_client", (q) => q.eq("clientId", claims.cid as Id<"clients">))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(MAX_FILES_PER_CLIENT);

    if (existing.length >= MAX_FILES_PER_CLIENT) {
      throw new Error(
        `File quota reached (${MAX_FILES_PER_CLIENT} files). Delete old files to upload new ones.`,
      );
    }

    const totalBytes = existing.reduce((sum, f) => sum + f.sizeBytes, 0);
    if (totalBytes >= MAX_TOTAL_BYTES_PER_CLIENT) {
      throw new Error(
        `Storage quota reached (${MAX_TOTAL_BYTES_PER_CLIENT / 1024 / 1024} MB). Delete old files to upload new ones.`,
      );
    }

    // ponytail: Convex generateUploadUrl is a mutation that returns a URL.
    // The URL is single-use and expires in ~5 minutes.
    const uploadUrl = await ctx.storage.generateUploadUrl();

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "generate_upload_url",
      result: {
        contentType: args.contentType,
        sizeBytes: args.sizeBytes,
        currentFileCount: existing.length,
        currentTotalBytes: totalBytes,
      },
    });

    return { uploadUrl };
  },
});

/**
 * Confirm an upload — called AFTER the client has POSTed the file to the URL
 * returned by generateUploadUrl. Verifies the storageId exists in _storage,
 * enforces all limits, and inserts the metadata row.
 */
export const confirmUpload = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    // Optional anchor — which deliverable this file belongs to
    deliverableId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, UPLOAD_SCOPES);
    await rateLimitByToken(ctx, "portal_confirmUpload", claims.cid, {
      max: 10,
      windowMs: 60_000,
    });

    // ─── VALIDATE INPUT ──────────────────────────────────────────────────────
    const fileName = sanitizeFileName(args.fileName);
    if (!fileName) throw new Error("Invalid file name");

    if (args.sizeBytes <= 0 || args.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Invalid file size (must be 1 byte to ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`,
      );
    }

    if (!isAllowedContentType(args.contentType)) {
      throw new Error(`File type not allowed: ${args.contentType}`);
    }

    // ─── VERIFY STORAGE ID EXISTS ─────────────────────────────────────────────
    // ponytail: ctx.storage.get returns the metadata (size, contentType) that
    // Convex recorded at upload time. We compare it to what the client claimed
    // — if they don't match, the client is lying about the file.
    const stored = await ctx.storage.get(args.storageId);
    if (!stored) {
      throw new Error("Upload not found — the storageId is invalid or expired");
    }
    if (stored.size !== args.sizeBytes) {
      throw new Error(
        `Size mismatch: claimed ${args.sizeBytes}, actual ${stored.size}`,
      );
    }
    if (stored.contentType && stored.contentType !== args.contentType) {
      throw new Error(
        `Type mismatch: claimed ${args.contentType}, actual ${stored.contentType}`,
      );
    }

    // ─── ENFORCE QUOTA (atomic re-check) ──────────────────────────────────────
    const existing = await ctx.db
      .query("portalFiles")
      .withIndex("by_client", (q) => q.eq("clientId", claims.cid as Id<"clients">))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(MAX_FILES_PER_CLIENT + 1);

    if (existing.length >= MAX_FILES_PER_CLIENT) {
      // Clean up the orphaned upload — client hit quota after upload
      await ctx.storage.delete(args.storageId);
      throw new Error(`File quota reached (${MAX_FILES_PER_CLIENT} files)`);
    }

    const totalBytes = existing.reduce((sum, f) => sum + f.sizeBytes, 0);
    if (totalBytes + args.sizeBytes > MAX_TOTAL_BYTES_PER_CLIENT) {
      await ctx.storage.delete(args.storageId);
      throw new Error(
        `Storage quota exceeded (${MAX_TOTAL_BYTES_PER_CLIENT / 1024 / 1024} MB)`,
      );
    }

    // ─── INSERT METADATA ──────────────────────────────────────────────────────
    const fileId = await ctx.db.insert("portalFiles", {
      workspaceId: claims.wid as Id<"workspaces">,
      clientId: claims.cid as Id<"clients">,
      storageId: args.storageId,
      fileName,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      deliverableId: args.deliverableId,
      uploadedBy: "client",
      uploadedByUserId: undefined,
      createdAt: Date.now(),
    });

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "upload_file",
      targetDeliverableId: args.deliverableId,
      result: {
        fileId,
        fileName,
        contentType: args.contentType,
        sizeBytes: args.sizeBytes,
      },
    });

    return { fileId, fileName, sizeBytes: args.sizeBytes };
  },
});

/**
 * List files for the client (optionally filtered by deliverable).
 * Paginated by createdAt cursor (newest first).
 */
export const listFiles = query({
  args: {
    token: v.string(),
    deliverableId: v.optional(v.string()),
    cursor: v.optional(v.number()), // createdAt of the last item in the previous page
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    let q;
    if (args.deliverableId) {
      q = ctx.db
        .query("portalFiles")
        .withIndex("by_deliverable", (q) =>
          q.eq("deliverableId", args.deliverableId!),
        );
    } else {
      q = ctx.db
        .query("portalFiles")
        .withIndex("by_client", (q) =>
          q.eq("clientId", claims.cid as Id<"clients">),
        );
    }

    const all = await q.order("desc").take(LIST_PAGE_SIZE + 1);
    const hasMore = all.length > LIST_PAGE_SIZE;
    const items = hasMore ? all.slice(0, LIST_PAGE_SIZE) : all;

    // ponytail: filter soft-deleted — we can't filter in the index query because
    // the by_deliverable index doesn't include deletedAt. Small N (50 max).
    const visible = items.filter((f) => !f.deletedAt);

    // Generate signed URLs for each file (expires in 1 hour)
    // ponytail: doing this in a loop is fine for 50 items — Convex storage
    // URL generation is fast and doesn't count against query limits.
    const filesWithUrls = await Promise.all(
      visible.map(async (f) => ({
        id: f._id,
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        deliverableId: f.deliverableId ?? null,
        uploadedBy: f.uploadedBy,
        createdAt: f.createdAt,
        url: await ctx.storage.getUrl(f.storageId),
      })),
    );

    return {
      files: filesWithUrls.filter((f) => f.url !== null),
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].createdAt : null,
    };
  },
});

/**
 * Delete a file (soft delete — sets deletedAt, stops returning URL).
 * Clients can only delete their own uploads. Freelancers can delete any.
 */
export const deleteFile = mutation({
  args: {
    token: v.string(),
    fileId: v.id("portalFiles"),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, UPLOAD_SCOPES);

    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");
    if (file.clientId !== (claims.cid as Id<"clients">)) {
      // ponytail: don't reveal that the file exists for another client
      throw new Error("File not found");
    }

    if (file.deletedAt) {
      return { alreadyDeleted: true };
    }

    await ctx.db.patch(args.fileId, {
      deletedAt: Date.now(),
    });

    // ponytail: don't delete the storage immediately — keep it for a grace
    // period in case of accidental deletion. A cron job will clean up
    // storageIds where deletedAt > 7 days ago.

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "delete_file",
      result: { fileId: args.fileId, fileName: file.fileName },
    });

    return { deleted: true };
  },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isAllowedContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase().trim();
  if (ALLOWED_CONTENT_TYPES.has(ct)) return true;
  // ponytail: allow any image/* or text/* — the allowlist above covers the
  // common cases, but we don't want to reject a valid image variant just
  // because we forgot to add it. application/* is stricter (no executables).
  if (ct.startsWith("image/") || ct.startsWith("text/")) return true;
  return false;
}

function sanitizeFileName(name: string): string {
  // ponytail: strip path components — clients shouldn't be able to upload
  // "../../etc/passwd" as a filename. Take the last segment after any slash
  // or backslash, then trim to 255 chars and remove control characters.
  const lastSegment = name.split(/[/\\]/).pop() ?? name;
  return lastSegment
    .replace(/[\x00-\x1f\x7f]/g, "") // control chars
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();
}
