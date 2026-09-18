/**
 * Resolve public runtime assets relative to the built app.
 *
 * Vite is configured with base "./", so relative paths work both in Capacitor
 * and when dist/index.html is hosted below a nested path (for example GitHack).
 * Root-relative paths ("/foo.webp") escape that nested base and therefore break
 * on GitHack. Keep external/data/blob URLs untouched and normalise local assets.
 */
export function assetPath(value: string | null | undefined): string {
  if (!value) return "";
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return value;
  return value.replace(/^\/+/, "");
}
