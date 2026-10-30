/**
 * Workout Streak Calculation Engine for Trainr
 * Uses local calendar dates to avoid UTC offset bugs and allows up to N rest days between workouts.
 */

/**
 * Returns a local 'YYYY-MM-DD' date string for a given Date, timestamp, or ISO string.
 */
export function toLocalDateKey(dateInput: string | Date | number): string {
  const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes calendar days between two 'YYYY-MM-DD' dates (d1 - d2).
 */
export function diffCalendarDays(dateKey1: string, dateKey2: string): number {
  const [y1, m1, d1] = dateKey1.split('-').map(Number);
  const [y2, m2, d2] = dateKey2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / msPerDay);
}

/**
 * Calculates continuous workout streak allowing up to maxRestDays between sessions.
 * 
 * @param workoutDates Array of ISO date strings or Date objects of completed workouts
 * @param maxRestDays Maximum rest days allowed between workouts before streak resets (default 2)
 * @param referenceDate Base date for "today" (defaults to new Date())
 */
export function calculateWorkoutStreak(
  workoutDates: Array<string | Date>,
  maxRestDays = 2,
  referenceDate = new Date()
): number {
  if (!workoutDates || workoutDates.length === 0) return 0;

  // Extract unique local date keys
  const dateSet = new Set<string>();
  for (const item of workoutDates) {
    const key = toLocalDateKey(item);
    if (key) dateSet.add(key);
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) return 0;

  const todayKey = toLocalDateKey(referenceDate);
  const daysSinceLatest = diffCalendarDays(todayKey, sortedDates[0]);

  // If latest workout was in the future, treat as today
  const effectiveDaysSinceLatest = Math.max(0, daysSinceLatest);

  // If more than maxRestDays + 1 days have passed since the latest workout, streak is broken
  if (effectiveDaysSinceLatest > maxRestDays + 1) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const diff = diffCalendarDays(sortedDates[i], sortedDates[i + 1]);
    const restDaysBetween = diff - 1;

    if (restDaysBetween <= maxRestDays) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
