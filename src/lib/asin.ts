// Pulls an Amazon ASIN out of a Jira task title (e.g. "CREA: Infographics_
// DermaRoller - Facial Roller (B0DMTP8TVX)" -> "B0DMTP8TVX"). Standard ASINs
// are 10 characters, and on this project's CREATE tasks they consistently
// start with "B0" — if your titles use a different pattern (or Amazon
// starts minting non-B0 ASINs), edit the regex below; every task whose
// title doesn't match lands in the "No ASIN Detected" bucket on the By
// Product page, where it can still be tagged to a product by hand.
const ASIN_REGEX = /\bB0[A-Z0-9]{8}\b/;

export function extractAsin(title: string): string | null {
  const match = title.match(ASIN_REGEX);
  return match ? match[0] : null;
}
