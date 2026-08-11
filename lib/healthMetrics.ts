/**
 * Health Metrics & Formula Calculator Engine for Trainr
 */

export interface BodyStats {
  heightCm: number;
  weightKg: number;
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  ageYears?: number;
  neckCm?: number;
  waistCm?: number;
  hipsCm?: number;
  activityLevel?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE';
}

export interface CalculatedHealthMetrics {
  bmi: number;
  bmiCategory: string;
  estimatedBodyFatPct: number | null;
  bmrKcal: number;
  tdeeKcal: number;
}

/**
 * Calculates BMI (Body Mass Index)
 */
export function calculateBMI(heightCm: number, weightKg: number): { bmi: number; category: string } {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) {
    return { bmi: 0, category: 'Unknown' };
  }
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 18.5 && bmi < 25) category = 'Normal Weight';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else category = 'Obese';

  return { bmi, category };
}

/**
 * Calculates Body Fat % using U.S. Navy Tape Method (cm based)
 */
export function calculateNavyBodyFatPct(stats: BodyStats): number | null {
  const { heightCm, sex, neckCm, waistCm, hipsCm } = stats;

  if (!heightCm || !neckCm || !waistCm) return null;

  const log10 = (val: number) => Math.log10(val);

  if (sex === 'FEMALE') {
    if (!hipsCm) return null;
    const diff = waistCm + hipsCm - neckCm;
    if (diff <= 0) return null;
    const bodyFat = 163.205 * log10(diff) - 97.684 * log10(heightCm) - 78.387;
    return parseFloat(Math.max(3, Math.min(60, bodyFat)).toFixed(1));
  } else {
    // Default to Male formula
    const diff = waistCm - neckCm;
    if (diff <= 0) return null;
    const bodyFat = 86.010 * log10(diff) - 70.041 * log10(heightCm) + 36.76;
    return parseFloat(Math.max(3, Math.min(60, bodyFat)).toFixed(1));
  }
}

/**
 * Calculates Basal Metabolic Rate (BMR) via Mifflin-St Jeor Formula
 */
export function calculateBMR(stats: BodyStats): number {
  const { heightCm, weightKg, sex, ageYears = 25 } = stats;
  if (!heightCm || !weightKg) return 2000;

  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === 'FEMALE') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 */
export function calculateTDEE(stats: BodyStats): number {
  const bmr = calculateBMR(stats);
  const multipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9,
  };

  const mult = multipliers[stats.activityLevel || 'MODERATELY_ACTIVE'] || 1.55;
  return Math.round(bmr * mult);
}

/**
 * Calculates Estimated 1 Rep Max (1RM) using Epley Formula
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const oneRM = weightKg * (1 + reps / 30);
  return parseFloat(oneRM.toFixed(1));
}

/**
 * Compiles overall health metrics
 */
export function computeFullHealthMetrics(stats: BodyStats): CalculatedHealthMetrics {
  const { bmi, category } = calculateBMI(stats.heightCm, stats.weightKg);
  const estimatedBodyFatPct = calculateNavyBodyFatPct(stats);
  const bmrKcal = calculateBMR(stats);
  const tdeeKcal = calculateTDEE(stats);

  return {
    bmi,
    bmiCategory: category,
    estimatedBodyFatPct,
    bmrKcal,
    tdeeKcal,
  };
}
