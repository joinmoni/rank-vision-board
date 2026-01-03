/**
 * Vision Board Generation Orchestrator
 * 
 * Main function that coordinates all components:
 * - Layout generation
 * - AI-powered search query generation
 * - Image fetching
 * - Text generation
 * - Canvas composition
 */

import { generateLayout, getRandomTemplate } from "./layout";
import { ImageProvider } from "./image-provider";
import {
  generateImageSearchQueries,
  generateMotivationalText,
} from "./ai-prompts";
import { composeVisionBoard as composeCanvas, CanvasConfig } from "./canvas";
import { LayoutTemplate, ImageAsset, TextBlock, UserGoals, VisionBoardResult } from "./types";
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";

export type GenerateVisionBoardOptions = {
  goals: string[];
  vibe?: "soft-life" | "luxury" | "fitness" | "career" | "travel";
  imageProvider: ImageProvider;
  layoutTemplate?: LayoutTemplate;
  canvasSize?: { width: number; height: number };
  backgroundColor?: string;
  openai?: OpenAI; // Made optional for debugging
  logoPath?: string;
};

export type VisionBoardResultWithTemplate = VisionBoardResult & {
  layoutTemplate: LayoutTemplate;
};

/**
 * Main orchestrator function
 */
export async function composeVisionBoardFromGoals(
  options: GenerateVisionBoardOptions
): Promise<VisionBoardResultWithTemplate> {
  const {
    goals,
    vibe,
    imageProvider,
    layoutTemplate,
    // A4 aspect ratio for dense tiling (Pinterest-style but portrait)
    // A4: 8.27 x 11.69 inches
    // At 300 DPI: 2480 x 3508 pixels
    // For web, use 1654 x 2339 (scaled down)
    canvasSize = { width: 1654, height: 2339 },
    backgroundColor = "#F6F4F0",
    openai,
    logoPath,
  } = options;

  // 1. Select or use provided layout template
  // Force scrapbook collage style
  const template = "editorial_grid"; // Will generate scrapbook layout
  const layoutSlots = generateLayout(template, canvasSize);

  // 2. Generate image search queries from goals using OpenAI
  // Need 18-25 images for dense tiling (no gaps)
  const userGoals: UserGoals = { goals, vibe };
  console.log("🔍 [ORCHESTRATOR] Generating search queries...");
  let searchQueries = await generateImageSearchQueries(openai, userGoals);
  
  // Ensure we have enough queries to get 18-25 images
  // Each query returns up to 10 images, so we need at least 2-3 queries
  // Generate more queries to ensure we have enough images
  const minQueries = 3;
  if (searchQueries.length < minQueries) {
    // Duplicate and vary queries to get more images
    const additionalQueries = searchQueries.flatMap(q => [
      { ...q, query: q.query + " lifestyle" },
      { ...q, query: q.query + " group" },
    ]);
    searchQueries = [...searchQueries, ...additionalQueries];
  }
  
  console.log(`✅ [ORCHESTRATOR] Generated ${searchQueries.length} search queries:`, searchQueries);

  // 3. Fetch images from provider
  console.log("🖼️  [ORCHESTRATOR] Fetching images from provider...");
  const allImages = await imageProvider.searchImages(searchQueries);
  console.log(`✅ [ORCHESTRATOR] Fetched ${allImages.length} images`);

  if (allImages.length === 0) {
    console.error("❌ [ORCHESTRATOR] No images found for the given goals");
    throw new Error("No images found for the given goals");
  }
  
  console.log("📸 [ORCHESTRATOR] Sample images:", allImages.slice(0, 3).map(img => ({
    id: img.id,
    source: img.source,
    dimensions: `${img.width}x${img.height}`,
  })));

  // 4. Generate motivational text using OpenAI
  console.log("✍️  [ORCHESTRATOR] Generating motivational text...");
  const textBlocks = await generateMotivationalText(openai, userGoals);
  console.log(`✅ [ORCHESTRATOR] Generated ${textBlocks.length} text blocks:`, textBlocks);

  // 5. Load logo if provided
  let logoBuffer: Buffer | undefined;
  if (logoPath) {
    try {
      const logoSvgContent = (await readFile(logoPath)).toString();
      // Replace orange fill colors with white
      const whiteLogoContent = logoSvgContent
        .replace(/#F77500/g, "#FFFFFF")
        .replace(/#f77500/g, "#FFFFFF");
      logoBuffer = Buffer.from(whiteLogoContent);
    } catch (error) {
      console.warn("Could not load logo:", error);
    }
  }

  // 6. Compose canvas
  const canvasConfig: CanvasConfig = {
    width: canvasSize.width,
    height: canvasSize.height,
    backgroundColor,
  };

  const composition = await composeCanvas(
    canvasConfig,
    layoutSlots,
    allImages,
    textBlocks,
    logoBuffer
  );

  return {
    imageBuffer: composition.imageBuffer,
    width: composition.width,
    height: composition.height,
    imagesUsed: allImages.slice(0, layoutSlots.filter((s) => s.type === "image").length),
    textBlocks,
    layoutTemplate: template,
  };
}

