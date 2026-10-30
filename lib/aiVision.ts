/**
 * Gemini 2.0 Flash Multimodal Vision API Integration
 * Specialized for South Asian / Indian Subcontinent Cuisine Recognition
 */

import { FoodItem } from '../store/nutritionStore';
import logger from './logger';

export interface AIMealScanResult {
  dishName: string;
  confidenceScore: number;
  identifiedItems: FoodItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  notes?: string;
}

const SOUTH_ASIAN_FOOD_PROMPT = `
Analyze the meal image as a South Asian cuisine nutritionist (referencing ICMR-NIN data). Identify all items, estimate portion weights from visual tableware scale, account for hidden cooking fats (ghee, oil/tadka, cream), and calculate itemized and total macronutrients.

Your output must return ONLY raw JSON (no markdown, no backticks, no explanations) using this exact schema:

{
  "dish_name": "String (Summary title of the entire plate/meal)",
  "confidence_score": Float (Confidence rating between 0.00 and 1.00),
  "identified_items": [
    {
      "name": "String (Specific item name)",
      "quantity": "String (Human-readable count and estimated weight, e.g., '2 pieces (60g)')",
      "calories": Integer,
      "protein_g": Float,
      "carbs_g": Float,
      "fat_g": Float
    }
  ],
  "total_calories": Integer,
  "total_protein_g": Float,
  "total_carbs_g": Float,
  "total_fat_g": Float
}

---

Do NOT include markdown formatting or backticks around the JSON.
`;

/**
 * Convert local file URI to clean base64 data string
 */
async function uriToBase64(uri: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const cleanBase64 = base64data.split(',')[1] || base64data;
        resolve(cleanBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    logger.warn('[aiVision] Failed converting URI to base64:', e);
    return null;
  }
}

import { supabase } from './supabase';

/** Thrown when the meal photo could not be analyzed. */
export class MealScanError extends Error {}

/**
 * Analyzes a meal photo via the `analyze-meal` Supabase Edge Function (or a
 * custom proxy URL). Throws MealScanError on failure; it never returns
 * made-up results, so the user can fall back to manual entry.
 */
export async function analyzeMealImage(
  photoUriOrBase64: string,
  base64Data?: string
): Promise<AIMealScanResult> {
  const proxyUrl = process.env.EXPO_PUBLIC_VISION_PROXY_URL;
  logger.log('[AI Vision] Proxy URL status:', proxyUrl ? 'configured' : 'using Supabase Functions / fallback');

  let finalBase64 = base64Data;
  if (!finalBase64 && photoUriOrBase64) {
    const looksLikeBase64 = photoUriOrBase64.length > 500 && !photoUriOrBase64.startsWith('http') && !photoUriOrBase64.startsWith('file:') && !photoUriOrBase64.startsWith('ph:');
    if (looksLikeBase64) {
      finalBase64 = photoUriOrBase64;
    } else {
      finalBase64 = (await uriToBase64(photoUriOrBase64)) || undefined;
    }
  }

  if (!finalBase64) {
    throw new MealScanError('Could not read the photo.');
  }

  let failure = 'The meal analyzer is unavailable right now.';
  {
    try {
      // 1A. If custom proxy URL specified in .env, call it directly
      if (proxyUrl) {
        logger.log('[AI Vision] Invoking custom proxy URL:', proxyUrl);
        const res = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: finalBase64 }),
        });

        if (res.ok) {
          const parsedResult: AIMealScanResult = await res.json();
          if (isUsableResult(parsedResult)) {
            logger.log('[AI Vision] Successfully received scan result from proxy URL');
            return parsedResult;
          }
          failure = 'No food could be identified in this photo.';
        } else {
          logger.warn(`[AI Vision] Custom proxy returned status ${res.status}`);
        }
      } else {
        // 1B. Invoke Supabase Edge Function 'analyze-meal' directly using Supabase client
        logger.log('[AI Vision] Invoking Supabase Edge Function analyze-meal');
        const { data, error } = await supabase.functions.invoke('analyze-meal', {
          body: { imageBase64: finalBase64 },
        });

        if (!error && isUsableResult(data)) {
          logger.log('[AI Vision] Successfully received scan result from Supabase Edge Function');
          return data as AIMealScanResult;
        } else if (error) {
          logger.warn('[AI Vision] Supabase Edge Function invocation failed:', error.message || error);
        } else {
          failure = 'No food could be identified in this photo.';
        }
      }
    } catch (err) {
      logger.warn('[AI Vision] Meal analysis request failed:', err);
      failure = 'Could not reach the meal analyzer. Check your connection.';
    }
  }

  throw new MealScanError(failure);
}

function isUsableResult(data: any): data is AIMealScanResult {
  return !!data && typeof data.dishName === 'string' && Array.isArray(data.identifiedItems) && data.identifiedItems.length > 0;
}
