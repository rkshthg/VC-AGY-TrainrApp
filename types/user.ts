/**
 * User & Authentication Domain Types
 * @module types/user
 */

export type UserRole = 'trainer' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  sex?: 'Male' | 'Female' | 'Other';
  height_cm?: number;
  weight_kg?: number;
  weight_goal?: string;
  onboarding_completed?: boolean;
  trainer_code?: string;
  created_at?: string;
}

export interface TrainerProfile {
  id: string;
  user_id: string;
  specialties?: string[];
  bio?: string;
  invite_code?: string;
  trainer_code?: string;
}

export interface BodyMeasurements {
  chest_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  bicep_cm?: number;
  thigh_cm?: number;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  trainer_id?: string;
  fitness_goal?: string;
  weight_goal?: string;
  sex?: 'Male' | 'Female' | 'Other';
  height_cm?: number;
  weight_kg?: number;
  body_measurements?: BodyMeasurements;
  calorie_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  onboarding_completed?: boolean;
}

export interface ClientInvite {
  id: string;
  trainer_id: string;
  client_email: string;
  invite_code: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at?: string;
}

export interface TrainerClientRelationship {
  id: string;
  trainer_id: string;
  client_id: string;
  status: 'pending' | 'accepted' | 'terminated';
  created_at?: string;
}
