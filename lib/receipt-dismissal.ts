/** Apply an explicit Close intent only to navigation within its evidence context. */
export function receiptDismissalHref(href: string, dismissedUrl: string | null): string {
  if (!dismissedUrl || !href.startsWith("/") || href.startsWith("//")) return href;
  const source = new URL(dismissedUrl);
  const target = new URL(href, source);
  const researchRoute = /^(?:\/mouthfolio)?\/(?:companies|voices)\/[^/]+$/;
  if (!researchRoute.test(source.pathname) || !researchRoute.test(target.pathname)) return href;
  // Keep all values: malformed duplicate parameters must not become valid context.
  for (const key of ["company", "asof", "window", "state", "receipt"]) {
    const before = source.searchParams.getAll(key);
    const after = target.searchParams.getAll(key);
    if (key === "state") {
      if (!before.length) before.push("available");
      if (!after.length) after.push("available");
    }
    if (before.length !== 1 || after.length !== 1 || before[0] !== after[0]) return href;
  }
  target.searchParams.delete("receipt");
  return `${target.pathname}?${target.searchParams}${target.hash}`;
}
