/**
 * Date and timezone formatting utilities.
 * Ensures timestamps stored in UTC (e.g. from MySQL / SQLite CURRENT_TIMESTAMP)
 * render properly in the device-local timezone (e.g. America/Toronto) rather than
 * being parsed as local time and suffering a UTC offset shift.
 */

/**
 * Safely parse a date string or timestamp into a Date object.
 * Handles:
 * - "YYYY-MM-DD HH:MM:SS" (MySQL/SQLite UTC timestamp) -> converted to UTC ISO
 * - "YYYY-MM-DDTHH:MM:SS" (without timezone) -> treated as UTC
 * - "YYYY-MM-DD" (pure date) -> treated as local midnight
 * - Standard ISO strings with 'Z' or offset -> standard Date parse
 */
export function parseDate(input?: string | number | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // MySQL / SQLite format "YYYY-MM-DD HH:MM:SS"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    const d = new Date(str.replace(' ', 'T') + 'Z');
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO string missing timezone suffix "YYYY-MM-DDTHH:MM:SS"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    const d = new Date(str + 'Z');
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format relative age (e.g. "5m ago", "2h ago", "3d ago", "Oct 24")
 */
export function formatAge(dateStr?: string | number | Date | null): string {
  const date = parseDate(dateStr);
  if (!date) return '';

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Format a timestamp into date + time in device-local timezone.
 */
export function formatDateTime(
  dateStr?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return date.toLocaleString(undefined, options || { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Format a timestamp into time only (e.g. "3:45 PM") in device-local timezone.
 */
export function formatTime(
  dateStr?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return date.toLocaleTimeString(undefined, options || { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a date string into date only (e.g. "Oct 24, 2026") in device-local timezone.
 */
export function formatDate(
  dateStr?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric', year: 'numeric' });
}
