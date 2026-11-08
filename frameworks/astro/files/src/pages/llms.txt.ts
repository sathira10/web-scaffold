import type { APIRoute } from "astro";
import { llmsTxt, type LlmsSection } from "@/lib/llms";
import { inOrder } from "@/lib/parts";

// A module adds a section with a file in src/parts/llms/ whose default export returns one.
const parts = inOrder(import.meta.glob("../parts/llms/*.ts", { eager: true })) as (() => Promise<LlmsSection>)[];

export const GET: APIRoute = async () => {
  const sections = await Promise.all(parts.map((part) => part()));
  return new Response(llmsTxt(sections), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
