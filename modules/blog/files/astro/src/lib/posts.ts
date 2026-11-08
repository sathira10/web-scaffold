import { getCollection } from "astro:content";

/** Published posts, newest first. Drafts show only in `pnpm dev`. */
export async function publishedPosts() {
  const posts = await getCollection("posts", (post) => import.meta.env.DEV || !post.data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}
