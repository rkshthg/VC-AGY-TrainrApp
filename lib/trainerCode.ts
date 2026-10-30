/** Trainer codes look like `AB-12CD` (XX-XXXX). */
export const TRAINER_CODE_PLACEHOLDER = 'AB-12CD';
export const TRAINER_CODE_MAX_LENGTH = 7;

/** Formats typed text as XX-XXXX: uppercases, drops other characters, adds the dash. */
export function formatTrainerCodeInput(text: string): string {
  const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return raw.length > 2 ? `${raw.slice(0, 2)}-${raw.slice(2)}` : raw;
}
