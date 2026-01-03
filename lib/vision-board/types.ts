/**
 * Shared types for vision board composition system
 */

export type LayoutSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: "portrait" | "square" | "landscape";
  type: "image" | "text";
};

export type LayoutTemplate = "editorial_grid" | "soft_collage" | "minimal_blocks";

export type ImageSearchQuery = {
  query: string;
  orientation: "portrait" | "square" | "landscape";
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

