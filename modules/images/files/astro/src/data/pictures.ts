// Every picture on the site, with its credit. Pages use <Picture name="..." />, and /credits
// lists the credits. `sample: true` marks a stand-in; a demo build badges it "Sample image".
// Put files in src/assets/pictures/ so Astro can resize them.
import sampleSrc from "@/assets/pictures/sample.jpg";

export type PictureInfo = {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  /** For /credits. Leave creator null when the source names nobody. */
  title: string;
  creator: string | null;
  license: string;
  licenseUrl?: string;
  page?: string;
  sample?: boolean;
};

const entries = {
  sample: {
    src: sampleSrc,
    alt: "Layered blue-gray hills under a pale sky",
    title: "Sample landscape",
    creator: null,
    license: "made for web-scaffold, free to use",
    sample: true,
  },
} satisfies Record<string, PictureInfo>;

export type PictureKey = keyof typeof entries;
export const pictures: Record<PictureKey, PictureInfo> = entries;
