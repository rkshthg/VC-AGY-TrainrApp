/**
 * Unit System Conversion & Formatting Utilities for Trainr
 * Supports global toggle between Metric (kg, cm) and Imperial (lbs, in).
 */

export type UnitSystem = 'METRIC' | 'IMPERIAL';

/**
 * Converts and formats weight from kilograms to current unit system string.
 * @param kg Weight in kilograms
 * @param unitSystem Current active unit system
 * @param decimals Number of decimal places (default 1)
 */
export function formatWeight(
  kg: number | undefined | null,
  unitSystem: UnitSystem = 'METRIC',
  decimals: number = 1
): string {
  if (kg === undefined || kg === null || isNaN(kg)) return '—';
  if (unitSystem === 'IMPERIAL') {
    const lbs = kg * 2.20462;
    return `${lbs.toFixed(decimals)} lbs`;
  }
  return `${kg.toFixed(decimals)} kg`;
}

/**
 * Converts weight from kg to target unit system number (raw value without string suffix)
 */
export function convertWeight(kg: number, unitSystem: UnitSystem = 'METRIC'): number {
  if (isNaN(kg)) return 0;
  if (unitSystem === 'IMPERIAL') {
    return parseFloat((kg * 2.20462).toFixed(2));
  }
  return parseFloat(kg.toFixed(2));
}

/**
 * Converts input weight from target unit system back to standard stored kg
 */
export function parseWeightToKg(val: number, unitSystem: UnitSystem = 'METRIC'): number {
  if (isNaN(val)) return 0;
  if (unitSystem === 'IMPERIAL') {
    return parseFloat((val / 2.20462).toFixed(2));
  }
  return parseFloat(val.toFixed(2));
}


/**
 * Converts and formats length / body measurement from centimeters.
 * @param cm Length in centimeters
 * @param unitSystem Current active unit system
 * @param decimals Number of decimal places (default 1)
 */
export function formatLength(
  cm: number | undefined | null,
  unitSystem: UnitSystem = 'METRIC',
  decimals: number = 1
): string {
  if (cm === undefined || cm === null || isNaN(cm)) return '—';
  if (unitSystem === 'IMPERIAL') {
    const inches = cm * 0.393701;
    return `${inches.toFixed(decimals)} in`;
  }
  return `${cm.toFixed(decimals)} cm`;
}

/**
 * Converts length from cm to target unit system number
 */
export function convertLength(cm: number, unitSystem: UnitSystem = 'METRIC'): number {
  if (unitSystem === 'IMPERIAL') {
    return parseFloat((cm * 0.393701).toFixed(1));
  }
  return parseFloat(cm.toFixed(1));
}

/**
 * Converts input length from target unit system back to standard stored cm
 */
export function parseLengthToCm(val: number, unitSystem: UnitSystem = 'METRIC'): number {
  if (unitSystem === 'IMPERIAL') {
    return parseFloat((val / 0.393701).toFixed(1));
  }
  return val;
}

/**
 * Formats height from cm to feet & inches (Imperial) or cm (Metric)
 */
export function formatHeight(
  cm: number | undefined | null,
  unitSystem: UnitSystem = 'METRIC'
): string {
  if (cm === undefined || cm === null || isNaN(cm)) return '—';
  if (unitSystem === 'IMPERIAL') {
    const totalInches = cm * 0.393701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

/**
 * Formats large volume numbers (e.g. 4,250 kg / 9,370 lbs)
 */
export function formatVolume(
  volumeKg: number | undefined | null,
  unitSystem: UnitSystem = 'METRIC'
): string {
  if (volumeKg === undefined || volumeKg === null || isNaN(volumeKg)) return '0';
  const val = unitSystem === 'IMPERIAL' ? volumeKg * 2.20462 : volumeKg;
  const unit = unitSystem === 'IMPERIAL' ? 'lbs' : 'kg';
  if (val >= 1000) {
    const formatted = (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1);
    return `${formatted}k ${unit}`;
  }
  return `${Math.round(val).toLocaleString()} ${unit}`;
}

/**
 * Returns weight unit label (kg / lbs)
 */
export function getWeightUnitLabel(unitSystem: UnitSystem = 'METRIC'): string {
  return unitSystem === 'IMPERIAL' ? 'lbs' : 'kg';
}

/**
 * Returns length unit label (cm / in)
 */
export function getLengthUnitLabel(unitSystem: UnitSystem = 'METRIC'): string {
  return unitSystem === 'IMPERIAL' ? 'in' : 'cm';
}
