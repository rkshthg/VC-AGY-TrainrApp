import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured on Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: SOUTH_ASIAN_FOOD_PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };

    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-flash-lite-latest',
    ];

    let rawText: string | null = null;
    let lastError: string | null = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[analyze-meal] Calling Gemini model: ${modelName}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': apiKey,
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const data = await response.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) break;
        } else {
          lastError = await response.text();
          console.warn(`[analyze-meal] Model ${modelName} error (${response.status}): ${lastError}`);
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[analyze-meal] Model ${modelName} fetch exception:`, lastError);
      }
    }

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'Failed to process image with Gemini AI', details: lastError }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean markdown code blocks if returned
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(cleanedText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'The AI response could not be read. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const round1 = (val: number) => Math.round(val * 10) / 10;

    const parsedResult = {
      dishName: rawParsed.dish_name || 'South Asian Meal Plate',
      confidenceScore: round1(rawParsed.confidence_score ?? 0.85),
      identifiedItems: (rawParsed.identified_items || []).map((item: any) => ({
        name: item.name || '',
        quantity: item.quantity || '',
        calories: round1(item.calories ?? 0),
        proteinG: round1(item.protein_g ?? 0),
        carbsG: round1(item.carbs_g ?? 0),
        fatG: round1(item.fat_g ?? 0),
      })),
      totalCalories: round1(rawParsed.total_calories ?? 0),
      totalProteinG: round1(rawParsed.total_protein_g ?? 0),
      totalCarbsG: round1(rawParsed.total_carbs_g ?? 0),
      totalFatG: round1(rawParsed.total_fat_g ?? 0),
      notes: rawParsed.notes || '',
    };

    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
