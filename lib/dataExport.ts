/**
 * Data Export Service for Trainr
 */

export function generateUserDataJSON(profile: any, meals: any[], workouts: any[], weightHistory: any[]): string {
  const exportBundle = {
    app: 'Trainr',
    exportedAt: new Date().toISOString(),
    profile,
    meals,
    workouts,
    weightHistory,
  };
  return JSON.stringify(exportBundle, null, 2);
}

export function generateWorkoutPlansJSON(plans: any[]): string {
  const exportBundle = {
    app: 'Trainr',
    exportedAt: new Date().toISOString(),
    workoutPlans: plans,
  };
  return JSON.stringify(exportBundle, null, 2);
}
