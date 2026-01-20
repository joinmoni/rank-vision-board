/**
 * OpenAI Prompt Functions
 * 
 * Uses OpenAI for intelligence only:
 * 1. Convert user goals into Pexels-friendly image search queries (SEARCH TAGS)
 * 2. Generate motivational text blocks
 * 3. Enhance queries with diverse representation (Black people, POC) when goals involve people
 */

import OpenAI from "openai";
import { UserGoals, ImageSearchQuery, TextBlock } from "./types";

// =============================================================================
// DIVERSE REPRESENTATION HELPERS
// =============================================================================

/**
 * Keywords that indicate a goal involves people/subjects that could benefit
 * from diverse representation in imagery
 */
const PERSON_KEYWORDS = [
  // Wedding/relationships
  "bride", "groom", "wedding", "married", "marriage", "couple", "engagement", "engaged",
  // Fitness/sports
  "runner", "athlete", "gym", "fitness", "yoga", "marathon", "exercise", "workout",
  // Career/professional
  "speaker", "entrepreneur", "business owner", "ceo", "executive", "professional", "graduate",
  "graduation", "degree", "interview", "promotion",
  // Personal/lifestyle
  "wearing", "dress", "suit", "style", "fashion", "model", "portrait",
  // Family
  "mother", "father", "parent", "family", "baby", "child", "kids",
  // Travel with people
  "selfie", "vacation photo", "tourist",
  // General person terms
  "person", "people", "woman", "women", "man", "men", "someone",
];

/**
 * Check if a goal text involves people
 */
function goalInvolvesPeople(goalText: string): boolean {
  const lowerGoal = goalText.toLowerCase();
  return PERSON_KEYWORDS.some(keyword => lowerGoal.includes(keyword));
}

/**
 * Add diverse representation hints to a search query
 * Only applies to goals that involve people
 */
function addDiversityHint(query: string, goalText: string): string {
  // If the query already has diversity terms, return as-is
  const diversityTerms = ["black", "african", "bipoc", "poc", "of color", "diverse"];
  const lowerQuery = query.toLowerCase();
  if (diversityTerms.some(term => lowerQuery.includes(term))) {
    return query;
  }
  
  // Check if this goal involves people
  if (!goalInvolvesPeople(goalText)) {
    return query; // Don't modify non-person goals (landscapes, buildings, etc.)
  }
  
  // Add appropriate diversity prefix based on context
  const lowerGoal = goalText.toLowerCase();
  
  // Wedding/couple contexts
  if (lowerGoal.includes("bride") || lowerGoal.includes("wedding") || lowerGoal.includes("married")) {
    return `Black ${query}`.replace(/\s+/g, " ").trim();
  }
  
  // Couple contexts
  if (lowerGoal.includes("couple") || lowerGoal.includes("engagement")) {
    return `Black couple ${query}`.replace(/\s+/g, " ").trim();
  }
  
  // Woman contexts
  if (lowerGoal.includes("woman") || lowerGoal.includes("her") || lowerGoal.includes("she")) {
    return `Black woman ${query}`.replace(/\s+/g, " ").trim();
  }
  
  // Man contexts
  if (lowerGoal.includes("man") && !lowerGoal.includes("woman")) {
    return `Black man ${query}`.replace(/\s+/g, " ").trim();
  }
  
  // General person context
  return `Black person ${query}`.replace(/\s+/g, " ").trim();
}

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
    
    for (let goalIndex = 0; goalIndex < validGoals.slice(0, 10).length; goalIndex++) {
      const goal = validGoals[goalIndex];
      const cleanedGoal = goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const involvesPeople = goalInvolvesPeople(goal);
      
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
      
      // Generate queries based on whether goal involves people
      if (involvesPeople) {
        // Person-related goals: add diversity hints
        fallbackQueries.push({
          query: addDiversityHint(`${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`, goal),
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `Black woman ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
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
          query: `African diaspora ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
          orientation: "portrait" as const,
          goalIndex,
          goalText: goal,
        });
      } else {
        // Non-person goals (landscapes, objects, etc.): no diversity hints needed
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} scenic`,
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} aesthetic`,
          orientation: "portrait" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} beautiful`,
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
      }
      
      // Always add a general scene query
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
    // Fallback: create basic queries from goals (with diverse representation for person goals)
    const fallbackQueries: ImageSearchQuery[] = [];
    const validGoals = userGoals.goals.filter((goal) => goal.trim() !== "");
    
    for (let goalIndex = 0; goalIndex < validGoals.slice(0, 10).length; goalIndex++) {
      const goal = validGoals[goalIndex];
      const cleanedGoal = goal.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const involvesPeople = goalInvolvesPeople(goal);
      
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
      
      // Generate queries based on whether goal involves people
      if (involvesPeople) {
        // Person-related goals: add diversity hints
        fallbackQueries.push({
          query: addDiversityHint(`${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`, goal),
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `Black woman ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
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
          query: `African diaspora ${cleanedGoal}${locationToken ? ` ${locationToken}` : ""}`,
          orientation: "portrait" as const,
          goalIndex,
          goalText: goal,
        });
      } else {
        // Non-person goals: no diversity hints
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} scenic`,
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} aesthetic`,
          orientation: "portrait" as const,
          goalIndex,
          goalText: goal,
        });
        fallbackQueries.push({
          query: `${cleanedGoal}${locationToken ? ` ${locationToken}` : ""} beautiful`,
          orientation: "landscape" as const,
          goalIndex,
          goalText: goal,
        });
      }
      
      // Always add a general scene query
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

/**
 * Generate goal-specific quotes (one per goal) for polaroid captions
 * Returns array of quote strings, one per goal
 */
export async function generateGoalQuotes(
  openai: OpenAI | undefined,
  goals: string[]
): Promise<string[]> {
  console.log("✍️  [AI-PROMPTS] Generating goal-specific quotes...");
  console.log("   - Goals:", goals);
  console.log("   - OpenAI available:", !!openai);
  
  const validGoals = goals.filter((g) => g.trim() !== "");
  if (validGoals.length === 0) {
    return [];
  }
  
  // If OpenAI is not available, use fallback quotes
  if (!openai) {
    console.log("⚠️  [AI-PROMPTS] OpenAI not available, using fallback quotes");
    const fallbackQuotes = validGoals.map((goal) => {
      // Simple fallback: capitalize and add "awaits" or similar
      const words = goal.trim().split(" ");
      const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      return `${firstWord} awaits my journey`;
    });
    return fallbackQuotes;
  }

  const goalsList = validGoals
    .map((goal, index) => `${index + 1}. ${goal.trim()}`)
    .join("\n");

  const prompt = `Generate ONE short, elegant quote/affirmation for EACH goal below. Each quote should be specific to that goal and feel like text printed on a polaroid photo.

User Goals:
${goalsList}

REQUIREMENTS:
- Generate EXACTLY one quote per goal (${validGoals.length} quotes total)
- Each quote should be specific to its goal (e.g., "Japan awaits my journey" for "travel to Japan")
- Short, bold, declarative (2-6 words)
- Feels like Instagram captions or journal affirmations
- Emotionally grounded, faith-forward if relevant
- No emojis, no hashtags
- Sentence case

EXAMPLES:
- Goal: "travel to Japan" → Quote: "Japan awaits my journey"
- Goal: "run a marathon" → Quote: "I run with purpose"
- Goal: "start a business" → Quote: "My dreams become reality"
- Goal: "learn Spanish" → Quote: "New languages open new worlds"

Output format (JSON object with "quotes" array):
{
  "quotes": [
    "Japan awaits my journey",
    "I run with purpose",
    "My dreams become reality"
  ]
}

The quotes array must have EXACTLY ${validGoals.length} items, one per goal in order.
Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate short, goal-specific quotes for polaroid photo captions. Each quote should be specific to its goal, feel like an Instagram caption or journal affirmation, and be 2-6 words. Always return valid JSON with a 'quotes' array containing exactly one quote per goal.",
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
      throw new Error("Could not parse JSON response");
    }

    // Extract quotes array
    const quotes: string[] = parsed.quotes || parsed.quote || [];
    
    // Validate: must have same length as goals
    if (!Array.isArray(quotes) || quotes.length !== validGoals.length) {
      console.warn(`⚠️  [AI-PROMPTS] Expected ${validGoals.length} quotes, got ${quotes.length}. Using fallback.`);
      // Fallback: generate simple quotes
      return validGoals.map((goal) => {
        const words = goal.trim().split(" ");
        const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        return `${firstWord} awaits my journey`;
      });
    }

    // Ensure all quotes are strings and trim them
    return quotes.map((q: any) => String(q || "").trim()).filter((q: string) => q.length > 0);
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error generating goal quotes, using fallback:", error);
    // Fallback: generate simple quotes
    return validGoals.map((goal) => {
      const words = goal.trim().split(" ");
      const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      return `${firstWord} awaits my journey`;
    });
  }
}

/**
 * Select best images using OpenAI intent ranking
 * 
 * Uses OpenAI to rank Pexels candidates based on semantic intent matching.
 * Returns the best background image and one best image per goal.
 */
export async function selectBestImagesWithOpenAI(
  openai: OpenAI | undefined,
  goals: Array<{ id: string; text: string }>,
  backgroundCandidates: Array<{
    id: string;
    url: string;
    photographer?: string;
    alt?: string;
    width: number;
    height: number;
    avg_color?: string;
    src?: { large: string; original: string };
  }>,
  goalCandidatesByGoal: Record<string, Array<{
    id: string;
    url: string;
    photographer?: string;
    alt?: string;
    width: number;
    height: number;
    avg_color?: string;
    src?: { large: string; original: string };
  }>>
): Promise<{
  background: { id: string; confidence: number };
  goals: Array<{ goalId: string; imageId: string; confidence: number }>;
  reasoning?: string;
}> {
  console.log("🎯 [AI-PROMPTS] Starting OpenAI image intent ranking...");
  console.log(`   - Goals: ${goals.length}`);
  console.log(`   - Background candidates: ${backgroundCandidates.length}`);
  console.log(`   - Goal candidates: ${Object.keys(goalCandidatesByGoal).length} goals`);
  
  // If OpenAI is not available, use fallback selection
  if (!openai) {
    console.log("⚠️  [AI-PROMPTS] OpenAI not available, using fallback selection");
    return selectBestImagesFallback(goals, backgroundCandidates, goalCandidatesByGoal);
  }

  // Cap candidates to reduce tokens (per spec: 8-12 per goal, 12-16 for background)
  const MAX_GOAL_CANDIDATES = 10;
  const MAX_BACKGROUND_CANDIDATES = 14;
  
  const cappedBackgroundCandidates = backgroundCandidates.slice(0, MAX_BACKGROUND_CANDIDATES);
  const cappedGoalCandidates: Record<string, typeof goalCandidatesByGoal[string]> = {};
  for (const goalId in goalCandidatesByGoal) {
    cappedGoalCandidates[goalId] = goalCandidatesByGoal[goalId].slice(0, MAX_GOAL_CANDIDATES);
  }

  // Build prompt with goals and candidate metadata
  const goalsList = goals.map((g, i) => `${i + 1}. ${g.text} (id: ${g.id})`).join("\n");
  
  const backgroundCandidatesList = cappedBackgroundCandidates.map((img, i) => {
    const url = img.url || "";
    const cleanUrl = url ? url.split("?")[0] : "N/A";
    return `  ${i + 1}. ID: ${img.id || "N/A"}
     - Alt: ${img.alt || "N/A"}
     - Photographer: ${img.photographer || "N/A"}
     - Size: ${img.width}x${img.height}
     - URL: ${cleanUrl}`;
  }).join("\n");

  const goalCandidatesList = goals.map(goal => {
    const candidates = cappedGoalCandidates[goal.id] || [];
    const candidatesText = candidates.map((img, i) => {
      return `    ${i + 1}. ID: ${img.id}
       - Alt: ${img.alt || "N/A"}
       - Photographer: ${img.photographer || "N/A"}
       - Size: ${img.width}x${img.height}`;
    }).join("\n");
    
    return `Goal "${goal.text}" (${goal.id}):
${candidatesText || "    (no candidates)"}`;
  }).join("\n\n");

  const prompt = `You are an expert at matching user goals to stock photos using only metadata. Your task is to select the best images based on semantic intent matching, not aesthetics.

User Goals:
${goalsList}

BACKGROUND IMAGE CANDIDATES (select 1):
Select ONE image that best represents the overall vibe/mood across ALL goals. Prefer:
- Landscape or large width/height images
- Strong "scene-setting" imagery
- Images that capture the combined essence of all goals

${backgroundCandidatesList}

GOAL-SPECIFIC IMAGE CANDIDATES (select 1 per goal):
For each goal, select ONE image that best matches that specific goal's intent. Prefer:
- Clear subject relevance to the goal
- Images that directly relate to the goal meaning
- Avoid duplicates: do not select the same image for multiple goals unless unavoidable

${goalCandidatesList}

REQUIREMENTS:
- Score each selection for "intent match" (0.0-1.0), not aesthetics
- Avoid selecting the same image for multiple goals
- Ensure every goal has exactly one image selected
- Ensure background has exactly one image selected
- Confidence scores should reflect how well the image matches the intent

Output format (JSON only):
{
  "background": {
    "id": "pexels-123456",
    "confidence": 0.85
  },
  "goals": [
    {
      "goalId": "goal-0",
      "imageId": "pexels-789012",
      "confidence": 0.92
    },
    {
      "goalId": "goal-1",
      "imageId": "pexels-345678",
      "confidence": 0.88
    }
  ],
  "reasoning": "Brief explanation of selections (optional)"
}

Return ONLY valid JSON, no markdown, no explanation outside JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at matching user goals to stock photos using only metadata. Return JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temperature for consistent ranking
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
      throw new Error("Could not parse JSON response");
    }

    // Validate and extract selection
    const background = parsed.background;
    const goals = parsed.goals || [];
    const reasoning = parsed.reasoning;

    if (!background || !background.id) {
      throw new Error("Missing background selection");
    }

    // Validate all goals have selections
    const goalIds = new Set(goals.map((g: { id: string }) => g.id));
    const expectedGoalIds = new Set(goals.map((g: { id: string }) => g.id));
    if (goals.length !== expectedGoalIds.size) {
      console.warn("⚠️  [AI-PROMPTS] Some goals missing from selection, will use fallback");
      return selectBestImagesFallback(goals, backgroundCandidates, goalCandidatesByGoal);
    }

    // Post-validation: ensure selected IDs exist in candidate lists
    const backgroundExists = cappedBackgroundCandidates.some(c => c.id === background.id);
    if (!backgroundExists) {
      console.warn(`⚠️  [AI-PROMPTS] Selected background ID ${background.id} not in candidates, using fallback`);
      return selectBestImagesFallback(goals, backgroundCandidates, goalCandidatesByGoal);
    }

    // Validate goal selections
    const validatedGoals: Array<{ goalId: string; imageId: string; confidence: number }> = [];
    const usedImageIds = new Set<string>([background.id]);
    
    for (const goalSelection of goals) {
      const goalId = goalSelection.goalId || goalSelection.goal;
      const imageId = goalSelection.imageId || goalSelection.id;
      const confidence = Math.max(0, Math.min(1, goalSelection.confidence || 0.5));
      
      const candidates = cappedGoalCandidates[goalId] || goalCandidatesByGoal[goalId] || [];
      const imageExists = candidates.some(c => c.id === imageId);
      
      if (!imageExists) {
        console.warn(`⚠️  [AI-PROMPTS] Selected image ID ${imageId} for goal ${goalId} not in candidates, using fallback`);
        // Use fallback for this goal
        const fallback = selectBestImagesFallback(
          [{ id: goalId, text: "" }],
          [],
          { [goalId]: candidates }
        );
        if (fallback.goals.length > 0) {
          validatedGoals.push(fallback.goals[0]);
          usedImageIds.add(fallback.goals[0].imageId);
        }
        continue;
      }
      
      // Deduplicate: if image already used, pick next best
      if (usedImageIds.has(imageId)) {
        console.warn(`⚠️  [AI-PROMPTS] Image ${imageId} already selected, picking next best for goal ${goalId}`);
        const candidates = cappedGoalCandidates[goalId] || goalCandidatesByGoal[goalId] || [];
        const available = candidates.filter(c => !usedImageIds.has(c.id));
        if (available.length > 0) {
          validatedGoals.push({
            goalId,
            imageId: available[0].id,
            confidence: confidence * 0.8, // Slightly lower confidence for fallback
          });
          usedImageIds.add(available[0].id);
        } else {
          // No alternatives, use the duplicate (last resort)
          validatedGoals.push({ goalId, imageId, confidence });
        }
      } else {
        validatedGoals.push({ goalId, imageId, confidence });
        usedImageIds.add(imageId);
      }
    }

    // Ensure every goal has a selection (fallback for missing)
    for (const goal of goals) {
      const hasSelection = validatedGoals.some(g => g.goalId === goal.id);
      if (!hasSelection) {
        console.warn(`⚠️  [AI-PROMPTS] Goal ${goal.id} missing selection, using fallback`);
        const candidates = goalCandidatesByGoal[goal.id] || [];
        if (candidates.length > 0) {
          const available = candidates.filter(c => !usedImageIds.has(c.id));
          const selected = available.length > 0 ? available[0] : candidates[0];
          validatedGoals.push({
            goalId: goal.id,
            imageId: selected.id,
            confidence: 0.5, // Lower confidence for fallback
          });
          usedImageIds.add(selected.id);
        }
      }
    }

    return {
      background: {
        id: background.id,
        confidence: Math.max(0, Math.min(1, background.confidence || 0.5)),
      },
      goals: validatedGoals,
      reasoning,
    };
  } catch (error: any) {
    console.error("⚠️  [AI-PROMPTS] Error in OpenAI image ranking, using fallback:", error);
    return selectBestImagesFallback(goals, backgroundCandidates, goalCandidatesByGoal);
  }
}

/**
 * Fallback selection when OpenAI is unavailable or fails
 * Simply picks the first candidate for each goal and background
 */
function selectBestImagesFallback(
  goals: Array<{ id: string; text: string }>,
  backgroundCandidates: Array<{ id: string }>,
  goalCandidatesByGoal: Record<string, Array<{ id: string }>>
): {
  background: { id: string; confidence: number };
  goals: Array<{ goalId: string; imageId: string; confidence: number }>;
} {
  const background = backgroundCandidates.length > 0
    ? { id: backgroundCandidates[0].id, confidence: 0.5 }
    : { id: "", confidence: 0 };

  const goalSelections = goals.map(goal => {
    const candidates = goalCandidatesByGoal[goal.id] || [];
    return {
      goalId: goal.id,
      imageId: candidates.length > 0 ? candidates[0].id : "",
      confidence: 0.5,
    };
  });

  return { background, goals: goalSelections };
}

// TODO: Part 2 - Placeholder for second requirement (not provided yet)
// export async function selectBestImagesPart2(...): Promise<...> {
//   // Implementation will be added when requirements are provided
// }
