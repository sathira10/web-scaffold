// Two tiers. Cloudflare Web Analytics sets no cookies and keeps no identifier, so it runs for every
// visitor and gives the honest visit count. Google Analytics and the Meta Pixel set cookies, so they
// load and send nothing until the visitor grants consent. With no IDs configured the module is a no-op.
import { site } from "@/data/site";

type ConsentValue = "granted" | "denied";
type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;
// Meta standard events the ads can optimize for; anything else is sent as a custom event.
export type MetaEvent = "Lead" | "Contact" | "ViewContent";

type Gtag = (command: "js" | "config" | "event", target: string | Date, params?: object) => void;
type Fbq = {
  (command: "init", pixelId: string): void;
  (command: "track" | "trackCustom", eventName: string, params?: object): void;
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  push?: Fbq;
  queue?: unknown[];
  version?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const OPEN_CONSENT_EVENT = `${site.slug}:open-analytics-consent`;
let memoryConsent: ConsentValue | null = null;
const STORAGE_KEY = `${site.slug}_analytics_consent`;

const GA_ID = /^G-[A-Z0-9]+$/.test(import.meta.env.PUBLIC_GA_MEASUREMENT_ID ?? "")
  ? (import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string)
  : undefined;
const META_ID = /^\d+$/.test(import.meta.env.PUBLIC_META_PIXEL_ID ?? "")
  ? (import.meta.env.PUBLIC_META_PIXEL_ID as string)
  : undefined;

const CLOUDFLARE_TOKEN = /^[a-f0-9]{32}$/i.test(
  import.meta.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? "",
)
  ? import.meta.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN
  : undefined;
let cloudflareReady = false;
let googleReady = false;
let metaReady = false;
let lastPagePath: string | null = null;

export function hasAnalyticsConfig(): boolean {
  return Boolean(GA_ID || META_ID || CLOUDFLARE_TOKEN);
}

// Consent is asked for only when a cookie-setting provider is configured.
export function hasConsentConfig(): boolean {
  return Boolean(GA_ID || META_ID);
}

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  const wasGranted = getConsent() === "granted";
  memoryConsent = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage blocked: consent simply does not persist.
  }
  if (value === "granted") {
    initAnalytics();
    trackPageView(window.location.pathname);
  } else if (wasGranted) {
    // Scripts already on the page cannot be unloaded; reload without them.
    clearAnalyticsCookies();
    window.location.reload();
  }
}

export function openConsent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

function clearAnalyticsCookies(): void {
  const hosts = [location.hostname, `.${location.hostname}`];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !/^(_ga|_gid|_gat|_fb)/.test(name)) continue;
    for (const domain of hosts) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  initCloudflare();
  if (getConsent() !== "granted") return;
  initGoogle();
  initMeta();
}

export function trackPageView(path: string, title?: string): void {
  if (getConsent() !== "granted" || path === lastPagePath) return;
  lastPagePath = path;
  initAnalytics();
  // The query string stays on page_location: GA4 reads the utm_* campaign from it.
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_location: `${window.location.origin}${path}${window.location.search ?? ""}`,
    page_title: title ?? document.title,
  });
  if (META_ID) window.fbq?.("track", "PageView");
}

export function trackEvent(name: string, params: AnalyticsParams = {}, meta?: MetaEvent): void {
  if (getConsent() !== "granted") return;
  initAnalytics();
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined),
  );
  window.gtag?.("event", name, clean);
  if (!META_ID) return;
  if (meta) window.fbq?.("track", meta, { ...clean, event: name });
  else window.fbq?.("trackCustom", name, clean);
}

function initGoogle(): void {
  if (!GA_ID || googleReady) return;
  googleReady = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js only acts on Arguments objects; a rest-parameter array sits in dataLayer unread.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  } as Gtag;
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`, "ga-tag");
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

function initMeta(): void {
  if (!META_ID || metaReady) return;
  metaReady = true;
  if (!window.fbq) {
    const queue: unknown[] = [];
    const fbq = ((...args: unknown[]) => {
      if (window.fbq?.callMethod) window.fbq.callMethod(...args);
      else queue.push(args);
    }) as Fbq;
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = queue;
  }
  loadScript("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
  window.fbq("init", META_ID);
}

function loadScript(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initCloudflare(): void {
  if (!CLOUDFLARE_TOKEN || cloudflareReady) return;
  cloudflareReady = true;
  const script = document.createElement("script");
  script.id = "cloudflare-analytics";
  script.dataset.cfBeacon = JSON.stringify({ token: CLOUDFLARE_TOKEN });
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.async = true;
  document.head.appendChild(script);
}
