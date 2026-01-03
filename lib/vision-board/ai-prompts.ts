/**
 * OpenAI Prompt Functions
 * 
 * Uses OpenAI for intelligence only:
 * 1. Convert user goals into Pexels-friendly image search queries
 * 2. Generate motivational text blocks
 */

import OpenAI from "openai";
import { UserGoals, ImageSearchQuery, TextBlock } from "./types";

/**
 * Convert user goals into lifestyle photography search queries
 * Optimized for Pexels (Instagram-style, descriptive queries)
 */
export async function generateImageSearchQueries(
  openai: OpenAI | undefined,
  userGoals: UserGoals
): Promise<ImageSearchQuery[]> {
  console.log("🔍 [AI-PROMPTS] Generating search queries...");
  console.log("   - Goals:", userGoals.goals);
  console.log("   - OpenAI available:", !!openai);
  
    // If OpenAI is not available, use simple fallback (with black people preference)
    if (!openai) {
      console.log("⚠️  [AI-PROMPTS] OpenAI not available, using simple fallback queries");
      const fallbackQueries = userGoals.goals
        .filter((goal) => goal.trim() !== "")
        .slice(0, 10)
        .map((goal) => ({
          query: `black people ${goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()}`,
          orientation: "landscape" as const,
        }));
      console.log("📝 [AI-PROMPTS] Fallback queries:", fallbackQueries);
      return fallbackQueries;
    }
  const goalsList = userGoals.goals
    .map((goal, index) => `${index + 1}. ${goal.trim()}`)
    .join("\n");

  const vibeContext = userGoals.vibe
    ? `The user's preferred vibe is: ${userGoals.vibe}.`
    : "";

  const prompt = `You are an expert visual curator creating a social-media-style vision board collage.

The final output MUST look like a real Pinterest / Instagram mood board made by a human — not a clean UI, not a poster, not a graphic design layout.

Think:
- saved Instagram photos
- camera roll moments
- messy but intentional
- emotionally rich
- aspirational lifestyle energy

Generate image search queries for a vision board collage.

IMPORTANT STYLE RULES:
- Images must feel like real social media photos, not stock photography
- Prefer candid moments, imperfect framing, cropped bodies, motion, laughter
- Prioritize lifestyle scenes over concepts
- No studio shots, no minimal product photos, no isolated objects
- Photos should feel like they were taken by friends on phones

CONTENT RULES:
- Focus on people, routines, environments, moments
- Include Black women / Black people explicitly
- Use warm, emotional, real-life situations

AESTHETIC:
- Pinterest mood board
- Instagram saved posts
- Vision board taped together
- Soft chaos, not symmetry

User Goals:
${goalsList}
${vibeContext}

Generate 10–15 short, concrete, Pexels-friendly queries.
Avoid abstract words like "success", "growth", "confidence".

For each query, determine the best orientation: portrait, square, or landscape.

Output format (JSON object with "queries" array):
{
  "queries": [
    {
      "query": "black women laughing together cafe candid",
      "orientation": "portrait"
    },
    {
      "query": "black woman morning routine bed natural light",
      "orientation": "landscape"
    }
  ]
}

Return only the list of queries.
Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert visual curator creating social-media-style vision board collages. Generate queries for real Instagram/Pinterest-style photos - candid, imperfect, emotionally rich. Always return valid JSON objects with a 'queries' array.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If direct array, use it; otherwise try to extract from object
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = { queries: JSON.parse(arrayMatch[0]) };
      } else {
        throw new Error("Could not parse JSON response");
      }
    }

    // Handle both direct array and object with queries key
    const queries: ImageSearchQuery[] = Array.isArray(parsed)
      ? parsed
      : parsed.queries || parsed.results || [];

    // Validate and ensure we have queries
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error("Invalid query format from OpenAI");
    }

    // Ensure valid orientations
    return queries.map((q) => ({
      query: q.query || String(q),
      orientation:
        q.orientation === "portrait" ||
        q.orientation === "square" ||
        q.orientation === "landscape"
          ? q.orientation
          : "landscape",
    }));
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error generating search queries, using fallback:", error);
    // Fallback: create basic queries from goals (with black people preference)
    const fallbackQueries = userGoals.goals
      .filter((goal) => goal.trim() !== "")
      .slice(0, 10)
      .map((goal) => ({
        query: `black people ${goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()}`,
        orientation: "landscape" as const,
      }));
    console.log("📝 [AI-PROMPTS] Fallback queries:", fallbackQueries);
    return fallbackQueries;
  }
}

/**
 * Generate 2-3 short, elegant motivational affirmations
 */
export async function generateMotivationalText(
  openai: OpenAI | undefined,
  userGoals: UserGoals
): Promise<TextBlock[]> {
  console.log("✍️  [AI-PROMPTS] Generating motivational text...");
  console.log("   - Goals:", userGoals.goals);
  console.log("   - OpenAI available:", !!openai);
  
  // If OpenAI is not available, use dummy text
  if (!openai) {
    console.log("⚠️  [AI-PROMPTS] OpenAI not available, using dummy text");
    const dummyTexts: TextBlock[] = [
      { text: "Everything I want, wants me more", tone: "bold" },
      { text: "God guides my steps", tone: "soft" },
      { text: "I'm living in my answered prayers", tone: "bold" },
      { text: "Time is not refundable, use it with intention", tone: "soft" },
      { text: "Make yours a priority", tone: "bold" },
    ];
    console.log("📝 [AI-PROMPTS] Dummy texts:", dummyTexts);
    return dummyTexts;
  }
  const goalsList = userGoals.goals
    .map((goal, index) => `${index + 1}. ${goal.trim()}`)
    .join("\n");

  const prompt = `Write short affirmations that feel like text pulled from a vision board collage.

User Goals:
${goalsList}

STYLE:
- Feels like Instagram captions, journal affirmations, or magazine cutouts
- Short, bold, declarative
- Emotionally grounded
- Faith-forward if relevant
- No emojis
- No hashtags

TONE:
- Soft confidence
- Grounded faith
- Intentional living
- Calm abundance

FORMAT RULES:
- 2–4 affirmations
- Max 6 words per line
- Sentence case or ALL CAPS
- No punctuation except periods if necessary

EXAMPLES (STYLE ONLY):
- God guides my steps
- Everything I want, wants me more
- Time is not refundable
- I'm living in my answered prayers
- Make yourself a priority

Output format (JSON object with "texts" array):
{
  "texts": [
    {
      "text": "God guides my steps",
      "tone": "soft"
    },
    {
      "text": "Everything I want, wants me more",
      "tone": "bold"
    }
  ]
}

Do NOT explain.
Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write short affirmations that feel like Instagram captions or journal entries - bold, declarative, emotionally grounded. Always return valid JSON objects with a 'texts' array.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = { texts: JSON.parse(arrayMatch[0]) };
      } else {
        throw new Error("Could not parse JSON response");
      }
    }

    // Handle both direct array and object with texts key
    const texts: TextBlock[] = Array.isArray(parsed)
      ? parsed
      : parsed.texts || parsed.affirmations || [];

    // Validate
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Invalid text format from OpenAI");
    }

    // Ensure valid format and limit to 4 (for dense mood board)
    return texts
      .slice(0, 4)
      .map((t) => ({
        text: t.text || String(t),
        tone: t.tone === "soft" || t.tone === "bold" ? t.tone : "soft",
      }));
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error generating motivational text, using fallback:", error);
    // Fallback: generic affirmations (scrapbook style)
    const fallbackTexts = [
      { text: "Everything I want, wants me more", tone: "bold" as const },
      { text: "God guides my steps", tone: "soft" as const },
      { text: "I'm living in my answered prayers", tone: "bold" as const },
      { text: "Time is not refundable, use it with intention", tone: "soft" as const },
      { text: "Make yours a priority", tone: "bold" as const },
    ];
    console.log("📝 [AI-PROMPTS] Fallback texts:", fallbackTexts);
    return fallbackTexts;
  }
}

