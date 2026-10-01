/** Always shown on the sale homepage — not editable per artwork. */
export const HOMEPAGE_LEDE =
  "One work. One week. The price falls from one million dollars to zero. Purchase it, or destroy it, for whatever the clock shows. If nobody acts, it is destroyed on livestream when the price hits zero.";

/** @deprecated Use HOMEPAGE_LEDE */
export const STATIC_ARTWORK_DESCRIPTION = HOMEPAGE_LEDE;

/** True if stored description is the old shared lede (should not sit in the details field). */
export function isHomepageLedeText(text: string | null | undefined): boolean {
  return (text ?? "").trim() === HOMEPAGE_LEDE.trim();
}
