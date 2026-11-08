// Added by the analytics module. Interface merging adds these to Astro's ImportMetaEnv.
interface ImportMetaEnv {
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  readonly PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?: string;
}
