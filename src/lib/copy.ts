/** Always shown on the sale homepage — not editable per artwork. */
export const HOMEPAGE_LEDE =
  "One work. One week. The price falls from one million dollars to zero. Purchase it, or destroy it, for whatever the clock shows. If nobody acts, it is destroyed on livestream when the price hits zero.";

/** Quote used in the top brand + sidebar layout (render with quotation marks). */
export const HOMEPAGE_QUOTE =
  "The ancients had a word for the joy and the sorrow of an opportunity that suddenly presents itself but is just as suddenly gone: kairos.";

export const HOMEPAGE_QUOTE_CITE_HREF = "https://www.ias.edu/ideas/baert-kairos";

export const HOMEPAGE_QUOTE_CITE_LABEL =
  "Barbara M.T.P. Baert, “Kairos: The Right Moment or Occasion,” Institute for Advanced Study.";

/** Sidebar action copy for the top-brand layout (buttons sit between the two blocks). */
export const SIDEBAR_RULES_LEAD = "The price falls for seven days.";

export const SIDEBAR_RULES_CHOICE =
  "Choose either action and pay the current price.";

export const SIDEBAR_RULES_AFTER =
  "If nobody acts, the work is destroyed when the price reaches zero.";

/** @deprecated Prefer SIDEBAR_RULES_LEAD + SIDEBAR_RULES_CHOICE */
export const SIDEBAR_RULES_BEFORE = `${SIDEBAR_RULES_LEAD} ${SIDEBAR_RULES_CHOICE}`;

/** @deprecated Use HOMEPAGE_LEDE */
export const STATIC_ARTWORK_DESCRIPTION = HOMEPAGE_LEDE;

/** True if stored description is the old shared lede (should not sit in the details field). */
export function isHomepageLedeText(text: string | null | undefined): boolean {
  return (text ?? "").trim() === HOMEPAGE_LEDE.trim();
}
