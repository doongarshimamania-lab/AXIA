// src/pages/BlogPost.tsx — /blog/:slug route.
//
// Loads a single blog post by slug from src/content/posts/*.tsx. Renders the
// post's `Content` component. Sets document title + meta description for SEO.

import { Link, useParams } from "react-router";
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

interface PostModule {
  frontmatter: Frontmatter;
  Content: () => React.ReactNode;
}

// Eager-load all post modules.
const postModules = import.meta.glob("../content/posts/*.tsx", { eager: true }) as Record<
  string,
  PostModule
>;

// Build a slug → module index for fast lookup.
const postsBySlug: Record<string, PostModule> = {};
for (const [path, mod] of Object.entries(postModules)) {
  if (mod.frontmatter) {
    postsBySlug[mod.frontmatter.slug] = mod;
  }
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? postsBySlug[slug] : undefined;

  // SEO: set document title + meta description per post.
  useEffect(() => {
    if (!post) {
      document.title = "Post not found — Axia Blog";
      return;
    }
    document.title = `${post.frontmatter.title} — Axia Blog`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", post.frontmatter.description);
    }
    // Set keywords meta (deprecated but harmless).
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", post.frontmatter.keywords.join(", "));
    }
    // Scroll to top on navigation.
    window.scrollTo(0, 0);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground font-[Space_Grotesk]">
            Post not found
          </h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't find a blog post at <code>/blog/{slug}</code>.
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  const fm = post.frontmatter;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link
          to="/blog"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All posts
        </Link>

        <header className="mt-6 border-b border-border pb-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted font-medium">{fm.category}</span>
            <time dateTime={fm.date}>
              {new Date(fm.date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </time>
            <span>·</span>
            <span>{fm.author}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-[Space_Grotesk] leading-tight">
            {fm.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {fm.description}
          </p>
        </header>

        {/* Article body — rendered from the post's Content component */}
        <article
          className="mt-8 space-y-4 text-sm sm:text-base text-foreground leading-relaxed
            [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:font-[Space_Grotesk] [&_h2]:tracking-tight
            [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:font-[Space_Grotesk]
            [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-foreground
            [&_p]:text-muted-foreground [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-muted-foreground
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:text-muted-foreground
            [&_li]:leading-relaxed
            [&_a]:text-foreground [&_a]:underline [&_a:hover]:text-primary
            [&_strong]:text-foreground [&_strong]:font-medium
            [&_em]:italic
            [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4
            [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
            [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-foreground
            [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-muted-foreground
            [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
            [&_hr]:my-8 [&_hr]:border-border"
        >
          <post.Content />
        </article>

        {/* CTA at end of every post */}
        <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground font-[Space_Grotesk]">
            Try Axia free
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The agency OS that replaces 5+ tools. No credit card required.
          </p>
          <Link
            to="/auth?mode=signup"
            className="mt-4 inline-block px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Get started →
          </Link>
        </div>
      </div>
    </div>
  );
}
