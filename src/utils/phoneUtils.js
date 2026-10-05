/**
 * Moroccan Phone Number Normalization and Validation Utilities
 */

/**
 * Normalizes any Moroccan phone number into the standard international format (+2126XXXXXXXX / +2127XXXXXXXX)
 * Accepts formats:
 * - 0612345678
 * - 0712345678
 * - +212612345678
 * - 212612345678
 * - 06 12 34 56 78
 * - 06-12-34-56-78
 */
export function normalizeMoroccanPhone(rawPhone) {
  if (!rawPhone) return '';

  // Remove spaces, hyphens, parentheses, and dots
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');

  // If starts with 00212, convert to +212
  if (cleaned.startsWith('00212')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If starts with 212 (without +), prepend +
  if (cleaned.startsWith('212')) {
    cleaned = '+' + cleaned;
  }

  // If starts with local prefix 06 or 07, convert to +2126 / +2127
  if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
    cleaned = '+212' + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Validates whether the given string is a valid Moroccan mobile number (06 or 07 series)
 */
export function isValidMoroccanPhone(rawPhone) {
  const normalized = normalizeMoroccanPhone(rawPhone);
  // Moroccan mobile numbers: +212 followed by 6 or 7 and 8 digits (total 13 chars)
  const regex = /^\+212[67]\d{8}$/;
  return regex.test(normalized);
}

/**
 * Formats a normalized phone for friendly local display (e.g. "06 12 34 56 78")
 */
export function formatPhoneForDisplay(phone) {
  const norm = normalizeMoroccanPhone(phone);
  if (!norm || norm.length !== 13) return phone || '';

  // Convert +212612345678 -> 06 12 34 56 78
  const local = '0' + norm.slice(4);
  return `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}
