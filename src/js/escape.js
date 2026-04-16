// escape.js — HTML escaping helper for safe innerHTML interpolation

/**
 * Escape a string for safe interpolation into innerHTML.
 * Handles &, <, >, ", and ' so the result is safe in both element bodies
 * and double/single-quoted attribute values.
 */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
