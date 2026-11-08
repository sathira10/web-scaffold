import type { LlmsSection } from "@/lib/llms";
import { publishedPosts } from "@/lib/posts";

/** The Posts section of llms.txt. */
export default async function posts(): Promise<LlmsSection> {
  return {
    heading: "Posts",
    links: (await publishedPosts()).map((post) => ({
      title: post.data.title,
      path: `/blog/${post.id}`,
      description: post.data.description,
    })),
  };
}
