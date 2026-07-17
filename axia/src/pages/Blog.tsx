// src/pages/Blog.tsx — /blog index.
//
// Lists all blog posts in src/content/posts/*.tsx. Uses Vite's
// `import.meta.glob` (built-in) to load each post module eagerly and extract
// its `frontmatter` export.
//
// ponytail: no MDX dependency, no CMS, no admin UI. Posts are committed to git;
// edits are PRs. This is the proper CMS for a small team — version control
// IS the CMS.

import { Link } from "react-router";
import { useEffect } from "react";

interface Frontmatter {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  keywords: string[];
}

// Eager-load all post modules. The import returns a promise that resolves to
// the module; `eager: true` makes Vite import them at build time and return
// the modules directly. `as: "own"` keeps the structure of `{ path: module }`.
const postModules = import.meta.glob("../content/posts/*.tsx", { eager: true }) as Record<
  string,
  { frontmatter: Frontmatter }
>;

const posts: Frontmatter[] = Object.entries(postModules)
  .map(([path, mod]) => {
    if (!mod.frontmatter) return null;
    return mod.frontmatter;
  })
  .filter((p): p is Frontmatter => p !== null)
  .sort((a, b) => b.date.localeCompare(a.date)); // newest first

export default function Blog() {
  // Set document title + meta description for SEO.
  useEffect(() => {
    document.title = "Axia Blog — Agency OS insights, tools, and case studies";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Insights on running an agency in 2026: tools, workflows, case studies, and the case for an agency operating system.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to app
        </Link>

        <header className="mt-6 border-b border-border pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-[Space_Grotesk]">
            The Axia Blog
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Insights on running an agency in 2026: tools, workflows, case studies, and the case for an agency operating system.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {posts.map((post) => (
            <article key={post.slug} className="group">
              <Link to={`/blog/${post.slug}`} className="block">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-muted font-medium">{post.category}</span>
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", { dateStyle: "long" })}
                  </time>
                  <span>·</span>
                  <span>{post.author}</span>
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-foreground font-[Space_Grotesk] group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {post.description}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
                  Read more →
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
