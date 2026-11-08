// Applies a saved light/dark choice before first paint, so it never flashes.
// Loaded as a plain file from 'self' because the CSP forbids inline scripts.
// Without a saved choice, tokens.css follows prefers-color-scheme.
try {
  const theme = localStorage.getItem("theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Storage can be blocked; the system setting applies.
}
