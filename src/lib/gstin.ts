// Customer GSTIN (B2B invoices). Format only — 2-digit state code, 10-char PAN,
// entity code, "Z", checksum char. We don't verify the checksum or hit the GST
// portal; this just catches typos before the number is printed on an invoice.
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstin(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isValidGstin(value: unknown): boolean {
  return GSTIN_RE.test(normalizeGstin(value));
}
