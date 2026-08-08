/**
 * Body Metrics & Progress Check-In Domain Types
 * @module types/progress
 */

export interface DBProgressCheckIn {
  id?: string;
  user_id: string;
  check_in_date: string;
  weight_kg: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  bmi?: number;
  ffmi?: number;
  waist_cm?: number;
  chest_cm?: number;
  bicep_cm?: number;
  hip_cm?: number;
  thigh_cm?: number;
  photo_uri?: string;
  is_starred?: boolean;
  notes?: string;
  created_at?: string;
}

export interface BodyCheckIn {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  chest_cm?: number;
  bicep_cm?: number;
  hip_cm?: number;
  thigh_cm?: number;
  photo_url?: string;
  is_starred?: boolean;
  notes?: string;
  bmi?: number;
  ffmi?: number;
}
