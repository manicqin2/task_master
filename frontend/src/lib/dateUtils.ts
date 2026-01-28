/**
 * Natural language date parsing utilities
 * Feature 008: Task Management UI Enhancements
 */

import * as chrono from 'chrono-node';

/**
 * Parse natural language date input to Date object
 * Examples: "tomorrow", "next Friday", "in 2 weeks"
 *
 * Handles edge case FR-013: "next Monday" on Monday should return next week Monday (+7 days)
 *
 * NOTE: For typos and complex natural language, the backend Gemini LLM provides
 * intelligent parsing during metadata extraction. This function handles:
 * - Standard natural language (chrono-node)
 * - Edge cases (FR-013)
 * - ISO date passthrough
 *
 * For typo tolerance (e.g., "tommorow" → "tomorrow"), use the backend metadata
 * extraction endpoint which leverages Gemini's LLM capabilities.
 *
 * @param input - Natural language date string
 * @param referenceDate - Optional reference date for relative parsing (defaults to now)
 * @returns Date object or null if parsing fails
 */
export function parseNaturalLanguageDate(
  input: string,
  referenceDate?: Date
): Date | null {
  if (!input || input.trim() === '') {
    return null;
  }

  const reference = referenceDate || new Date();
  const trimmedInput = input.trim();

  // Parse using chrono-node
  const parsed = chrono.parseDate(trimmedInput, reference);

  if (!parsed) {
    return null;
  }

  // Handle edge case FR-013: "next X" on day X should return +7 days
  // Example: "next Monday" on Monday should be next week Monday, not today
  const nextWeekdayPattern = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
  const match = trimmedInput.match(nextWeekdayPattern);

  if (match) {
    const targetWeekday = match[1].toLowerCase();
    const weekdayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const currentWeekday = reference.getDay();
    const targetWeekdayNum = weekdayMap[targetWeekday];

    // If today is the target weekday, ensure we get NEXT week's occurrence
    // Only add 7 days if chrono returned today's date (daysDiff === 0)
    if (currentWeekday === targetWeekdayNum) {
      const refDateOnly = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
      const parsedDateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

      const daysDiff = Math.floor((parsedDateOnly.getTime() - refDateOnly.getTime()) / (1000 * 60 * 60 * 24));

      // Only adjust if chrono returned today's date - don't interfere if it already
      // correctly returned a future date
      if (daysDiff === 0) {
        const result = new Date(parsed);
        result.setDate(result.getDate() + 7);
        return result;
      }
    }
  }

  return parsed;
}

/**
 * Format Date object to ISO date string (YYYY-MM-DD)
 *
 * @param date - Date object to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatToISO(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
