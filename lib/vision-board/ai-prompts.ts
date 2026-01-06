/**
 * OpenAI Prompt Functions
 * 
 * Uses OpenAI for intelligence only:
 * 1. Convert user goals into Pexels-friendly image search queries (SEARCH TAGS)
 * 2. Generate motivational text blocks
 */

import OpenAI from "openai";
import { UserGoals, ImageSearchQuery, TextBlock } from "./types";

/**
 * Convert user goals into concrete, visual, location-aware SEARCH TAGS
 * Tags are used to query Pexels (not to generate images directly)
 */
export async function generateImageSearchQueries(
  openai: OpenAI | undefined,
  userGoals: UserGoals
): Promise<ImageSearchQuery[]> {
  
  console.log("🔍 [AI-PROMPTS] Generating search tags from goals...");
  console.log("   - Goals:", userGoals.goals);
  console.log("   - OpenAI available:", !!openai);
  
  // If OpenAI is not available, use simple fallback (maintaining goal separation)
  if (!openai) {
    console.log("⚠️  [AI-PROMPTS] OpenAI not available, using simple fallback queries");
    const fallbackQueries: ImageSearchQuery[] = [];
    const validGoals = userGoals.goals.filter((goal) => goal.trim() !== "");
    
    for (const goal of validGoals.slice(0, 10)) {
      const cleanedGoal = goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      
      // Detect location tokens for travel goals
      const locationTokens: Record<string, string> = {
        "paris": "Paris France",
        "tokyo": "Tokyo Japan",
        "japan": "Tokyo Japan",
        "dubai": "Dubai UAE",
        "new york": "New York USA",
        "london": "London UK",
      };
      
      let locationToken = "";
      for (const [key, value] of Object.entries(locationTokens)) {
        if (cleanedGoal.includes(key)) {
          locationToken = value;
          break;
        }
      }
      
      // Generate 4 queries per goal in fallback (all with diversity terms)
      fallbackQueries.push({
        query: `black woman ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
      });
      fallbackQueries.push({
        query: `woman of color ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "portrait" as const,
      });
      fallbackQueries.push({
        query: `person of color ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
      });
      fallbackQueries.push({
        query: `black people ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "portrait" as const,
      });
      fallbackQueries.push({
        query: `${cleanedGoal} real life scene${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
      });
    }
    
    console.log(`📝 [AI-PROMPTS] Fallback: Generated ${fallbackQueries.length} queries for ${validGoals.length} goal(s)`);
    return fallbackQueries;
  }

  const goalsList = userGoals.goals
    .map((goal, index) => `${index + 1}. ${goal.trim()}`)
    .join("\n");

  const prompt = `You are generating Pexels search phrases (not AI images). Pexels returns real photos, so queries must be CONCRETE, VISUAL, and LOCATION-SPECIFIC.

User Goals:
${goalsList}

Return ONLY valid JSON using the schema below.

========================================
HARD RULES (NON-NEGOTIABLE)
========================================

A) PER-GOAL OUTPUT ONLY
- Treat each goal separately.
- Output 6 queries per goal (exactly).
- Each goal must include:
  - 4 "must_have"
  - 2 "nice_to_have"

B) MUST_HAVE QUERIES MUST CONTAIN VISUAL ANCHORS
Each goal must_have queries must include strong anchors:

If the goal is TRAVEL TO PARIS:
- At least 3 of the 4 must_have queries MUST include one of:
  "Eiffel Tower", "Louvre", "Seine river", "Montmartre", "Paris Metro"
- Always include "Paris France" in the query to avoid generic "street/cafe" photos from other countries.
- Example formats:
  "Eiffel Tower Paris France street"
  "Seine river bridge Paris France"
  "Louvre Museum Paris France exterior"
  "Montmartre Paris France street stairs"
  "Paris Metro station Paris France"

If the goal is ATTEND A MUSIC CONCERT:
- At least 3 of the 4 must_have queries MUST include one of:
  "concert stage", "crowd", "audience", "stage lights", "live performance", "microphone"
- These must be literal (not vibes):
  "concert stage lights crowd"
  "singer microphone live performance"
  "audience hands up concert lights"
  "live music venue stage"

C) BAN GENERIC LIFESTYLE QUERIES
- Do NOT generate generic queries like:
  "friends at cafe", "people eating", "restaurant", "friends hanging out"
  unless they also include the goal anchors above.
- Specifically:
  - If you use "cafe" for Paris, it MUST be:
    "Paris cafe exterior signage Paris France" (or include Eiffel/Seine/Louvre/Montmartre/Metro)

D) DIVERSITY REQUIREMENT (MANDATORY FOR ALL PEOPLE QUERIES)
- ALL queries that include people MUST include diversity descriptors:
  "black woman", "black man", "woman of color", "person of color", "diverse friends", "black couple", "people of color", "African American", "BIPOC"
- This is MANDATORY - every query with people must explicitly include these terms.
- Do NOT force POC descriptors on pure landmark shots (no people).
- When people appear in the query, ALWAYS include diversity terms - this ensures representation of black people and people of color in all vision board images.

E) QUERY SHAPE
- 5–12 words.
- Photo-real, concrete.
- Avoid abstract words like: abundance, manifest, success, destiny.
- Avoid indoor office/work terms unless the goal asks for it.

F) GLOBAL NEGATIVES
Include:
tomato, tomatoes, produce, vegetable vendor, market stall, fruit stand, bazaar, agriculture, farming,
office meeting, team meeting, coworkers

========================================
OUTPUT JSON SCHEMA
========================================
{
  "goals": [
    {
      "goal": "<exact original goal text>",
      "mustHaveVisuals": ["...3-6 anchors..."],
      "queries": [
        { "query": "...", "orientation": "portrait|landscape|square", "intent": "must_have|nice_to_have" }
      ]
    }
  ],
  "globalNegatives": ["..."]
}

Return ONLY JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate goal-specific, high-signal Pexels search queries. Each goal gets its own queries array (5-7 queries). Include visual anchors (landmarks, stage/crowd). MANDATORY: ALL queries that include people MUST include diversity descriptors like 'black woman', 'person of color', 'people of color', 'BIPOC' to ensure representation. Label queries as must_have (core imagery) or nice_to_have (supporting context). Return valid JSON with 'goals' array and 'globalNegatives' array.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
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
        parsed = { goals: JSON.parse(arrayMatch[0]) };
      } else {
        throw new Error("Could not parse JSON response");
      }
    }

    // Handle new structured format with goals array
    let allQueries: ImageSearchQuery[] = [];
    
    if (parsed.goals && Array.isArray(parsed.goals)) {
      // New format: goals array with queries per goal
      console.log(`📋 [AI-PROMPTS] Parsed ${parsed.goals.length} goal(s) with structured queries`);
      
      for (let goalIndex = 0; goalIndex < parsed.goals.length; goalIndex++) {
        const goalData = parsed.goals[goalIndex];
        const goalText = goalData.goal || "";
        const queries = goalData.queries || [];
        const mustHaveVisuals = goalData.mustHaveVisuals || [];
        
        console.log(`   Goal ${goalIndex}: "${goalText}"`);
        console.log(`   - Must-have visuals: ${mustHaveVisuals.join(", ")}`);
        console.log(`   - Queries: ${queries.length}`);
        
        // Sort queries so must_have comes first (priority order)
        const sorted = [...queries].sort((a, b) => {
          const ai = a.intent === "must_have" ? 0 : 1;
          const bi = b.intent === "must_have" ? 0 : 1;
          return ai - bi;
        });
        
        for (const q of sorted) {
          if (q.query) {
            allQueries.push({
              query: q.query,
              orientation:
                q.orientation === "portrait" ||
                q.orientation === "square" ||
                q.orientation === "landscape"
                  ? q.orientation
                  : "landscape",
              goalIndex,
              goalText,
              intent: q.intent === "must_have" || q.intent === "nice_to_have" ? q.intent : undefined,
            });
            console.log(`     - "${q.query}" [${q.orientation || "landscape"}] (${q.intent || "unknown"})`);
          }
        }
      }
      
      if (parsed.globalNegatives && Array.isArray(parsed.globalNegatives)) {
        console.log(`   Global negatives: ${parsed.globalNegatives.join(", ")}`);
      }
    } else if (parsed.queries && Array.isArray(parsed.queries)) {
      // Fallback: old format with flat queries array (no goal metadata)
      console.log("⚠️  [AI-PROMPTS] Received old format (flat queries array), using as-is");
      allQueries = parsed.queries.map((q: any) => ({
        query: q.query || String(q),
        orientation:
          q.orientation === "portrait" ||
          q.orientation === "square" ||
          q.orientation === "landscape"
            ? q.orientation
            : "landscape",
      }));
    } else if (Array.isArray(parsed)) {
      // Fallback: direct array (no goal metadata)
      console.log("⚠️  [AI-PROMPTS] Received direct array format, using as-is");
      allQueries = parsed.map((q: any) => ({
        query: q.query || String(q),
        orientation:
          q.orientation === "portrait" ||
          q.orientation === "square" ||
          q.orientation === "landscape"
            ? q.orientation
            : "landscape",
      }));
    } else {
      throw new Error("Invalid query format from OpenAI: expected 'goals' array or 'queries' array");
    }

    // Validate and ensure we have queries
    if (!Array.isArray(allQueries) || allQueries.length === 0) {
      throw new Error("No queries found in OpenAI response");
    }
    
    console.log(`✅ [AI-PROMPTS] Generated ${allQueries.length} total queries across all goals`);
    
    return allQueries;
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error generating search queries, using fallback:", error);
    // Fallback: create basic queries from goals (with POC preference, maintaining goal separation)
    const fallbackQueries: ImageSearchQuery[] = [];
    const validGoals = userGoals.goals.filter((goal) => goal.trim() !== "");
    
    for (let goalIndex = 0; goalIndex < validGoals.slice(0, 10).length; goalIndex++) {
      const goal = validGoals[goalIndex];
      const cleanedGoal = goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      
      // Detect location tokens for travel goals
      const locationTokens: Record<string, string> = {
        "paris": "Paris France",
        "tokyo": "Tokyo Japan",
        "japan": "Tokyo Japan",
        "dubai": "Dubai UAE",
        "new york": "New York USA",
        "london": "London UK",
      };
      
      let locationToken = "";
      for (const [key, value] of Object.entries(locationTokens)) {
        if (cleanedGoal.includes(key)) {
          locationToken = value;
          break;
        }
      }
      
      // Generate 4 queries per goal in fallback (with goal metadata, all with diversity terms)
      fallbackQueries.push({
        query: `black woman ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
        goalIndex,
        goalText: goal,
      });
      fallbackQueries.push({
        query: `woman of color ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "portrait" as const,
        goalIndex,
        goalText: goal,
      });
      fallbackQueries.push({
        query: `person of color ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
        goalIndex,
        goalText: goal,
      });
      fallbackQueries.push({
        query: `black people ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "portrait" as const,
        goalIndex,
        goalText: goal,
      });
      fallbackQueries.push({
        query: `${cleanedGoal} real life scene${locationToken ? ` ${locationToken}` : ""}`,
        orientation: "landscape" as const,
        goalIndex,
        goalText: goal,
      });
    }
    
    console.log(`📝 [AI-PROMPTS] Fallback: Generated ${fallbackQueries.length} queries for ${validGoals.length} goal(s)`);
    return fallbackQueries;
  }
}

/**
 * Generate 2-4 short, elegant motivational affirmations
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
      "tone": "soft",
      "role": "primary"
    },
    {
      "text": "Everything I want, wants me more",
      "tone": "bold",
      "role": "primary"
    },
    {
      "text": "Time is not refundable",
      "tone": "soft",
      "role": "secondary"
    }
  ]
}

ROLE ASSIGNMENT:
- "primary" (default): Main affirmations, emotional statements, short declarative phrases → Use Playfair Display font
- "secondary": Supporting text, longer explanatory phrases, grounding statements → Use Inter font
- If role is missing, default to "primary"

Do NOT explain.
Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write short affirmations that feel like Instagram captions or journal entries - bold, declarative, emotionally grounded. Assign 'role' to each text: 'primary' for main affirmations/emotional statements (uses Playfair Display font), 'secondary' for supporting/grounding text (uses Inter font). Default to 'primary' if role is missing. Always return valid JSON objects with a 'texts' array.",
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
        role: t.role === "primary" || t.role === "secondary" ? t.role : "primary", // default to primary
      }));
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error generating motivational text, using fallback:", error);
    // Fallback: generic affirmations (scrapbook style)
    const fallbackTexts = [
      { text: "Everything I want, wants me more", tone: "bold" as const, role: "primary" as const },
      { text: "God guides my steps", tone: "soft" as const, role: "primary" as const },
      { text: "I'm living in my answered prayers", tone: "bold" as const, role: "primary" as const },
      { text: "Time is not refundable, use it with intention", tone: "soft" as const, role: "secondary" as const },
      { text: "Make yours a priority", tone: "bold" as const, role: "primary" as const },
    ];
    console.log("📝 [AI-PROMPTS] Fallback texts:", fallbackTexts);
    return fallbackTexts;
  }
}
