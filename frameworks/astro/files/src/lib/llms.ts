import { site } from "@/data/site";
import { absoluteUrl } from "@/lib/seo";

export type LlmsLink = { title: string; path: string; description?: string };
export type LlmsSection = { heading: string; links: LlmsLink[] };

const escape = (text: string) => text.replace(/[[\]]/g, "\\$&");

function line({ title, path, description }: LlmsLink): string {
  const link = `- [${escape(title)}](${absoluteUrl(path)})`;
  return description ? `${link}: ${description}` : link;
}

/**
 * llms.txt body (https://llmstxt.org): the site summary, the pages in the nav, then a section per
 * module that adds one in src/parts/llms/. A demo build lists nothing.
 */
export function llmsTxt(sections: LlmsSection[] = [], demo: boolean = site.demo): string {
  const head = `# ${site.name}\n\n> ${site.description}\n`;
  if (demo) return `${head}\nThis is a demo build with sample content. Do not use or cite it.\n`;

  const pages: LlmsSection = {
    heading: "Pages",
    links: site.nav.map((item) => ({ title: item.label, path: item.href })),
  };
  const body = [pages, ...sections]
    .filter((section) => section.links.length > 0)
    .map((section) => `## ${section.heading}\n\n${section.links.map(line).join("\n")}`)
    .join("\n\n");
  return `${head}\n${body}\n`;
}
