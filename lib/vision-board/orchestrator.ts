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
import { LayoutTemplate, ImageAsset, TextBlock, UserGoals, VisionBoardResult, ImageWithGoal } from "./types";
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
  const userGoals: UserGoals = { goals, vibe };
  console.log("🔍 [ORCHESTRATOR] Generating search queries...");
  const searchQueries = await generateImageSearchQueries(openai, userGoals);
  console.log(`✅ [ORCHESTRATOR] Generated ${searchQueries.length} search queries`);

  // 3. Fetch images from provider with goal metadata
  console.log("🖼️  [ORCHESTRATOR] Fetching images from provider...");
  const allImagesWithGoals = await imageProvider.searchImagesWithGoals(searchQueries);
  console.log(`✅ [ORCHESTRATOR] Fetched ${allImagesWithGoals.length} images with goal metadata`);

  if (allImagesWithGoals.length === 0) {
    console.error("❌ [ORCHESTRATOR] No images found for the given goals");
    throw new Error("No images found for the given goals");
  }

  // 3a. Goal-balanced image selection (quota system)
  const numImageSlots = layoutSlots.filter((s) => s.type === "image").length;
  const targetImages = Math.min(numImageSlots, 25); // Target 18-25, but respect layout slots
  const validGoals = goals.filter((g) => g.trim() !== "");
  const numGoals = validGoals.length;

  console.log(`📊 [ORCHESTRATOR] Goal-balanced selection:`);
  console.log(`   - Target images: ${targetImages}`);
  console.log(`   - Number of goals: ${numGoals}`);

  // Group images by goal
  const imagesByGoal = new Map<number, ImageWithGoal[]>();
  for (const img of allImagesWithGoals) {
    const goalIdx = img.goalIndex;
    if (goalIdx >= 0) {
      if (!imagesByGoal.has(goalIdx)) {
        imagesByGoal.set(goalIdx, []);
      }
      imagesByGoal.get(goalIdx)!.push(img);
    }
  }

  // Sort images within each goal by relevance score (highest first)
  for (const [goalIdx, images] of imagesByGoal.entries()) {
    images.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }

  const DEBUG_VISION_BOARD = process.env.DEBUG_VISION_BOARD === "true";

  if (DEBUG_VISION_BOARD || numGoals >= 2) {
    console.log(`📋 [ORCHESTRATOR] Images available per goal:`);
    for (let i = 0; i < numGoals; i++) {
      const images = imagesByGoal.get(i) || [];
      const goalText = validGoals[i] || `Goal ${i}`;
      console.log(`   Goal ${i} ("${goalText}"): ${images.length} images`);
    }
  }

  // Calculate quotas (even split with minimum 20% per goal if >= 2 goals)
  const quotas = new Map<number, number>();
  if (numGoals >= 2) {
    const evenSplit = Math.floor(targetImages / numGoals);
    const minQuota = Math.floor(targetImages * 0.20); // 20% minimum
    const baseQuota = Math.max(evenSplit, minQuota);

    for (let i = 0; i < numGoals; i++) {
      quotas.set(i, baseQuota);
    }

    // Distribute remaining slots
    const totalQuota = baseQuota * numGoals;
    let remaining = targetImages - totalQuota;
    let goalIdx = 0;
    while (remaining > 0 && goalIdx < numGoals) {
      quotas.set(goalIdx, quotas.get(goalIdx)! + 1);
      remaining--;
      goalIdx = (goalIdx + 1) % numGoals;
    }
  } else {
    // Single goal: use all available slots
    quotas.set(0, targetImages);
  }

  if (DEBUG_VISION_BOARD || numGoals >= 2) {
    console.log(`🎯 [ORCHESTRATOR] Quotas per goal:`);
    for (let i = 0; i < numGoals; i++) {
      const quota = quotas.get(i) || 0;
      const goalText = validGoals[i] || `Goal ${i}`;
      console.log(`   Goal ${i} ("${goalText}"): quota = ${quota}`);
    }
  }

  // Two-pass selection
  const selectedImages: ImageWithGoal[] = [];
  const selectedByGoal = new Map<number, ImageWithGoal[]>();

  // Pass 1: Fill each goal bucket up to its quota
  for (let i = 0; i < numGoals; i++) {
    const quota = quotas.get(i) || 0;
    const available = imagesByGoal.get(i) || [];
    const selected = available.slice(0, quota);
    selectedByGoal.set(i, selected);
    selectedImages.push(...selected);

    if (DEBUG_VISION_BOARD || numGoals >= 2) {
      const goalText = validGoals[i] || `Goal ${i}`;
      if (selected.length < quota) {
        console.log(`⚠️  [ORCHESTRATOR] Goal ${i} ("${goalText}") quota not met: ${selected.length}/${quota} (insufficient images)`);
      }
    }
  }

  // Pass 2: Redistribute if some goals couldn't meet quota
  const totalSelected = selectedImages.length;
  if (totalSelected < targetImages) {
    const shortfall = targetImages - totalSelected;
    const goalQuotas = Array.from(quotas.entries());
    const goalAvailable = goalQuotas.map(([idx]) => {
      const available = imagesByGoal.get(idx) || [];
      const alreadySelected = selectedByGoal.get(idx) || [];
      return {
        goalIdx: idx,
        availableCount: available.length,
        alreadySelectedCount: alreadySelected.length,
        remaining: available.length - alreadySelected.length,
      };
    });

    // Find goals that can take more (without exceeding 70% max per goal)
    const maxPerGoal = Math.floor(targetImages * 0.70);
    const eligibleGoals = goalAvailable.filter(
      (g) => g.remaining > 0 && (selectedByGoal.get(g.goalIdx)?.length || 0) < maxPerGoal
    );

    // Sort by remaining availability (descending)
    eligibleGoals.sort((a, b) => b.remaining - a.remaining);

    // Redistribute shortfall
    let redistributed = 0;
    for (const eligible of eligibleGoals) {
      if (redistributed >= shortfall) break;

      const currentCount = selectedByGoal.get(eligible.goalIdx)?.length || 0;
      const maxAllowed = maxPerGoal - currentCount;
      const toAdd = Math.min(eligible.remaining, maxAllowed, shortfall - redistributed);

      if (toAdd > 0) {
        const available = imagesByGoal.get(eligible.goalIdx) || [];
        const alreadySelected = selectedByGoal.get(eligible.goalIdx) || [];
        const alreadySelectedIds = new Set(alreadySelected.map((img) => img.id));
        const newImages = available.filter((img) => !alreadySelectedIds.has(img.id)).slice(0, toAdd);

        selectedByGoal.set(eligible.goalIdx, [...alreadySelected, ...newImages]);
        selectedImages.push(...newImages);
        redistributed += newImages.length;

        if (DEBUG_VISION_BOARD) {
          const goalText = validGoals[eligible.goalIdx] || `Goal ${eligible.goalIdx}`;
          console.log(`🔄 [ORCHESTRATOR] Redistributed ${newImages.length} images to Goal ${eligible.goalIdx} ("${goalText}")`);
        }
      }
    }
  }

  // Final selection summary
  if (DEBUG_VISION_BOARD || numGoals >= 2) {
    console.log(`✅ [ORCHESTRATOR] Final selection per goal:`);
    for (let i = 0; i < numGoals; i++) {
      const selected = selectedByGoal.get(i) || [];
      const quota = quotas.get(i) || 0;
      const goalText = validGoals[i] || `Goal ${i}`;
      const status = selected.length >= quota ? "✅" : "⚠️";
      console.log(`   ${status} Goal ${i} ("${goalText}"): ${selected.length}/${quota} selected`);
    }
    console.log(`📊 [ORCHESTRATOR] Total selected: ${selectedImages.length}/${targetImages}`);
  }

  // Convert ImageWithGoal[] to ImageAsset[] for canvas
  const allImages = selectedImages.map((img) => ({
    id: img.id,
    url: img.url,
    width: img.width,
    height: img.height,
    photographer: img.photographer,
    source: img.source,
    downloadUrl: img.downloadUrl,
  }));

  console.log("📸 [ORCHESTRATOR] Selected images for composition:", allImages.slice(0, 3).map(img => ({
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
    imagesUsed: allImages, // Already balanced and trimmed to targetImages
    textBlocks,
    layoutTemplate: template,
  };
}

