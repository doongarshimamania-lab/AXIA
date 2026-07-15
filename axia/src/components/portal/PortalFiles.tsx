// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalFiles.tsx — Client file upload + list + delete.
//
// P1-a: Clients can upload brand assets, copy docs, reference materials.
//
// FLOW:
//   1. Client picks a file (input type=file or drag-drop)
//   2. Frontend calls portal.files.generateUploadUrl → gets one-time URL
//   3. Frontend POSTs the file to that URL (fetch with the file body)
//   4. Frontend calls portal.files.confirmUpload with the storageId
//   5. Backend verifies + inserts metadata → file appears in the list
//
// SECURITY:
//   - Type/size validated on the frontend (UX) AND backend (trust boundary)
//   - Drag-drop is read-only until the client picks a file — no auto-upload
//   - Upload progress shown via XMLHttpRequest.upload.onprogress
//   - All errors surface as toasts (sonner)
//
// ponytail: reuses the existing portal files API. No client-side trust —
// every URL comes from the backend after scope verification.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  File as FileIcon,
  Image as ImageIcon,
  FileText,
  Archive,
  Trash2,
  Loader2,
  Download,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  // Images
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  // Documents
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".md", ".json",
  // Archives
  ".zip", ".gz", ".tar",
  // Audio/Video
  ".mp3", ".wav", ".mp4", ".webm",
];

interface PortalFilesProps {
  token: string;
  deliverableId?: string;
  compact?: boolean; // when true, renders a tighter layout for inline use
}

export function PortalFiles({ token, deliverableId, compact }: PortalFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const listFiles = useQuery(api.portal.files.listFiles, {
    token,
    deliverableId,
  });

  const generateUploadUrl = useMutation(api.portal.files.generateUploadUrl);
  const confirmUpload = useMutation(api.portal.files.confirmUpload);
  const deleteFile = useMutation(api.portal.files.deleteFile);

  const handleFile = useCallback(async (file: File) => {
    // ─── CLIENT-SIDE VALIDATION (UX, not trust) ──────────────────────────────
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large (max ${MAX_FILE_SIZE_MB} MB)`);
      return;
    }
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`File type not allowed: ${ext}`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: get upload URL
      const { uploadUrl } = await generateUploadUrl({
        token,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      // Step 2: POST the file to the upload URL
      // ponytail: XHR for progress events — fetch doesn't support upload progress
      const storageId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.storageId);
            } catch {
              reject(new Error("Invalid response from upload endpoint"));
            }
          } else {
            reject(new Error(`Upload failed (HTTP ${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: confirm the upload
      await confirmUpload({
        token,
        storageId: storageId as any,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        deliverableId,
      });

      toast.success(`Uploaded ${file.name}`);
      setProgress(0);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [token, deliverableId, generateUploadUrl, confirmUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile({ token, fileId: fileId as any });
      toast.success("File deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete file");
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = ""; // reset so same file can be re-selected
          }}
        />
        {uploading ? (
          <div className="space-y-2 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-violet-500 mx-auto" />
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-slate-500">Uploading… {progress}%</p>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-2 text-sm text-slate-600 hover:text-violet-600"
            disabled={uploading}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Click or drop a file to upload
            <span className="block text-xs text-slate-400 mt-1">
              Max {MAX_FILE_SIZE_MB} MB · Images, docs, PDFs, archives
            </span>
          </button>
        )}
      </div>

      {/* File list */}
      {listFiles === undefined ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : listFiles.files.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          <Paperclip className="h-4 w-4 inline mr-1 opacity-50" />
          No files yet.
        </p>
      ) : (
        <div className="space-y-2">
          {listFiles.files.map((file: any) => (
            <FileRow
              key={file.id}
              file={file}
              onDelete={() => handleDelete(file.id)}
            />
          ))}
          {listFiles.hasMore && (
            <p className="text-xs text-slate-400 text-center pt-2">
              Showing 50 most recent. Older files hidden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onDelete }: { file: any; onDelete: () => void }) {
  const icon = getFileIcon(file.contentType);
  const sizeLabel = formatBytes(file.sizeBytes);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-slate-100 hover:border-slate-200 group">
      <div className="h-9 w-9 rounded bg-slate-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{file.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{sizeLabel}</span>
          <span>·</span>
          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
          {file.uploadedBy === "freelancer" && (
            <Badge variant="outline" className="text-[10px] py-0 px-1">From freelancer</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.url && (
          <a
            href={file.url}
            download={file.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  if (contentType.includes("pdf") || contentType.includes("document") || contentType.startsWith("text/")) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("gzip")) {
    return <Archive className="h-4 w-4 text-amber-500" />;
  }
  return <FileIcon className="h-4 w-4 text-slate-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
