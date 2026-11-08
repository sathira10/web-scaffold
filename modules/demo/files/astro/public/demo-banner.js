// Runs in <head>, before the body paints, so a closed demo banner never flashes on load.
// A classic blocking script on purpose: module scripts run after first paint.
// The storage key comes from the tag's data-key (src/parts/head/10-demo.astro).
try {
  var key = document.currentScript.dataset.key;
  if (window.localStorage.getItem(key) === "1") {
    document.documentElement.dataset.demoBanner = "closed";
  }
} catch {
  // Storage blocked: the banner shows.
}
