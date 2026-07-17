// scripts/generate-sitemap.mjs — Generate sitemap.xml for axia.app.
//
// Run before `vite build` (or as a `prebuild` script). Reads the list of
// public routes + the MDX blog posts in src/content/posts/, and writes
// public/sitemap.xml. ponytail: no dependency, just fs + path.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
// ponytail: when axia.app apex domain is acquired, update this single constant.
const DOMAIN = "https://axia-bay.vercel.app";

// Static public routes (no auth, no sidebar).
const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.9", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
];

// Scan TSX blog posts → /blog/<slug>
const postsDir = path.join(root, "src", "content", "posts");
const blogRoutes = [];
if (fs.existsSync(postsDir)) {
  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith(".tsx")) continue;
    const slug = file.replace(/\.tsx$/, "");
    // Read frontmatter to get lastmod date if present.
    const content = fs.readFileSync(path.join(postsDir, file), "utf8");
    const dateMatch = content.match(/date:\s*['"](\d{4}-\d{2}-\d{2})/);
    const lastmod = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];
    blogRoutes.push({
      path: `/blog/${slug}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod,
    });
  }
}

const allRoutes = [...staticRoutes, ...blogRoutes];

const today = new Date().toISOString().split("T")[0];
const urls = allRoutes
  .map((r) => {
    const lastmod = r.lastmod ?? today;
    return `  <url>
    <loc>${DOMAIN}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outPath = path.join(root, "public", "sitemap.xml");
fs.writeFileSync(outPath, xml, "utf8");
console.log(`✓ sitemap.xml written (${allRoutes.length} URLs) → ${outPath}`);
