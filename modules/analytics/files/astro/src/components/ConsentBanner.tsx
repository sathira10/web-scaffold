import { useEffect, useState } from "react";
import {
  OPEN_CONSENT_EVENT,
  getConsent,
  hasConsentConfig,
  initAnalytics,
  openConsent,
  setConsent,
  trackPageView,
} from "@/lib/analytics";

const button =
  "inline-flex min-h-11 items-center justify-center rounded-md px-5 text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Renders nothing unless a cookie-setting provider is configured. Mounted once by the layout with
 * `client:only`, so the first render can read the stored choice.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(() => hasConsentConfig() && getConsent() === null);

  useEffect(() => {
    if (!hasConsentConfig()) return;
    if (getConsent() !== null) {
      initAnalytics();
      trackPageView(window.location.pathname);
    }
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  if (!open) return null;

  function choose(value: "granted" | "denied") {
    setConsent(value);
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-accent bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex wrap flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Plain and short; the providers are named on /privacy. */}
        <p className="text-body">
          We use cookies to see how people find this site.{" "}
          <a className="underline underline-offset-4" href="/privacy">
            How we use them
          </a>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className={`${button} bg-accent text-accent-fg hover:bg-accent-hover`}
            onClick={() => choose("granted")}
          >
            Allow cookies
          </button>
          <button
            type="button"
            className={`${button} border border-line-strong bg-surface-raised hover:bg-bg`}
            onClick={() => choose("denied")}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that lets visitors change their mind. */
export function ConsentSettingsLink() {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center underline underline-offset-4"
      onClick={openConsent}
    >
      Analytics settings
    </button>
  );
}
