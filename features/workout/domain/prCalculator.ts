/**
 * Personal Record (PR) Engine & 1RM Math Utilities
 * Uses Epley 1RM Formula: 1RM = w * (1 + r / 30)
 * @module lib/prCalculator
 */

import { LoggedSet } from './workout';

export interface PRResult {
  isNew1RMPR: boolean;
  isNewMaxWeightPR: boolean;
  calculated1RM: number;
  previous1RM: number;
  maxWeight: number;
}

/**
 * Calculate One Rep Max (1RM) using Epley Formula
 * @param weightKg Weight lifted in kilograms
 * @param reps Repetitions performed
 * @returns Estimated 1RM in kilograms
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Calculate total workload volume in kilograms
 * @param sets Array of logged sets
 */
export function calculateVolume(sets: LoggedSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
}

/**
 * Check if a completed set breaks a historical Personal Record (PR)
 * @param exerciseName Name of the exercise
 * @param weightKg Weight lifted in kg
 * @param reps Reps completed
 * @param historical1RM Existing 1RM benchmark in kg
 * @param historicalMaxWeight Existing maximum single lift weight in kg
 */
export function checkPersonalRecord(
  exerciseName: string,
  weightKg: number,
  reps: number,
  historical1RM: number = 0,
  historicalMaxWeight: number = 0
): PRResult {
  const current1RM = calculate1RM(weightKg, reps);
  const isNew1RMPR = current1RM > historical1RM && historical1RM > 0;
  const isNewMaxWeightPR = weightKg > historicalMaxWeight && historicalMaxWeight > 0;

  return {
    isNew1RMPR,
    isNewMaxWeightPR,
    calculated1RM: current1RM,
    previous1RM: historical1RM,
    maxWeight: Math.max(weightKg, historicalMaxWeight),
  };
}
