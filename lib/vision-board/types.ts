/**
 * Shared types for vision board composition system
 */

export type LayoutSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: "portrait" | "square" | "landscape";
  type: "image" | "text" | "polaroid"; // "polaroid" for polaroid cards
  kind?: "background" | "image"; // "background" for background layer, undefined/"image" for regular images, "polaroid" for polaroid cards
  role?: "background"; // "background" for background image slot
  zIndex?: number; // Lower zIndex renders first (background should be 0)
  goalIndex?: number; // Goal index for polaroid cards (maps to goal/image/quote)
  rotation?: number; // Rotation angle in degrees
};

export type LayoutTemplate = "editorial_grid" | "soft_collage" | "minimal_blocks" | "polaroid_stack";

export type ImageSearchQuery = {
  query: string;
  orientation: "portrait" | "square" | "landscape";
  // Goal metadata for quota-based selection
  goalIndex?: number;
  goalText?: string;
  intent?: "must_have" | "nice_to_have";
};

export type ImageWithGoal = ImageAsset & {
  goalIndex: number;
  goalText: string;
  relevanceScore?: number;
  matchedQuery?: string;
  alt?: string; // Alt text from Pexels (for OpenAI ranking)
};

export type ImageAsset = {
  id: string;
  url: string;
  width: number;
  height: number;
  photographer?: string;
  source: "pexels" | "unsplash" | "custom";
  downloadUrl?: string;
};

export type TextBlock = {
  text: string;
  tone: "soft" | "bold";
  role?: "primary" | "secondary"; // primary = Playfair Display, secondary = Inter
};

export type UserGoals = {
  goals: string[];
  vibe?: "soft-life" | "luxury" | "fitness" | "career" | "travel";
};

export type VisionBoardResult = {
  imageBuffer: Buffer;
  width: number;
  height: number;
  imagesUsed: ImageAsset[];
  textBlocks: TextBlock[];
};

/**
 * Types for OpenAI-based image intent ranking
 */
export type Goal = {
  id: string; // Goal identifier (e.g., "goal-0", "goal-1")
  text: string; // Goal text (e.g., "travel to Japan")
};

export type PexelsCandidate = {
  id: string; // Pexels image ID (e.g., "pexels-123456")
  url: string; // Image URL
  photographer?: string;
  alt?: string; // Alt text / description
  width: number;
  height: number;
  avg_color?: string; // Average color hex code
  src?: {
    large: string;
    original: string;
  };
  // Additional metadata that might be available
  tags?: string[];
};

export type RankedSelection = {
  background: {
    id: string; // Selected background image ID
    confidence: number; // 0.0-1.0
  };
  goals: Array<{
    goalId: string; // Goal identifier
    imageId: string; // Selected image ID for this goal
    confidence: number; // 0.0-1.0
  }>;
  reasoning?: string; // Optional reasoning from OpenAI
};

/**
 * Stable data structure for polaroid cards - preserves goal-to-image-to-quote mapping
 */
export type GoalCard = {
  goalIndex: number; // 0-based index matching user goals array
  goalText: string; // Original goal text (e.g., "travel to Japan")
  quoteText: string; // Generated affirmation/quote for this goal (e.g., "Japan awaits my journey")
  imageUrl: string; // Selected best Pexels image URL for this goal
  imageId: string; // Image ID for reference
  imageDownloadUrl?: string; // Download URL for high-res version
};

export type VisionBoardAssets = {
  backgroundUrl: string; // Best "overall vibe" image (NOT part of cards array)
  backgroundId?: string; // Background image ID for reference
  backgroundDownloadUrl?: string; // Download URL for high-res version
  cards: GoalCard[]; // Length = goals.length (<=7), same order as user goals, sorted by goalIndex
};
