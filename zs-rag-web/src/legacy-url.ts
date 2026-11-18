const legacyOrigin = import.meta.env.VITE_LEGACY_WEB_ORIGIN || (() => {
  const url = new URL(window.location.origin);
  url.port = import.meta.env.VITE_LEGACY_WEB_PORT || '9222';
  return url.origin;
})();

export function legacyUrl(path: string) {
  return new URL(path, legacyOrigin).href;
}
