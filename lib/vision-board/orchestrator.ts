/**
 * Vision Board Generation Orchestrator - A4 Lambda Version
 * 
 * Main function that coordinates all components:
 * - Layout generation (A4 portrait with goal-count-based colors)
 * - AI-powered search query generation
 * - Image fetching
 * - Text generation
 * - Canvas composition (full backend render)
 */

import { generateLayout, getA4Layout, A4_CANVAS, A4_OUTER_BG, GoalCount } from "./layout";
import { ImageProvider } from "./image-provider";
import {
  generateImageSearchQueries,
  generateMotivationalText,
  generateGoalQuotes,
  selectBestImagesWithOpenAI,
} from "./ai-prompts";
import { composeVisionBoard as composeCanvas, CanvasConfig } from "./canvas";
import { LayoutTemplate, ImageAsset, TextBlock, UserGoals, VisionBoardResult, ImageWithGoal, GoalCard, VisionBoardAssets } from "./types";
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
  userName?: string; // User's name for title display
  openai?: OpenAI;
  logoPath?: string;
};

export type VisionBoardResultWithTemplate = VisionBoardResult & {
  layoutTemplate: LayoutTemplate;
};

/**
 * Main orchestrator function - A4 Lambda Version
 */
export async function composeVisionBoardFromGoals(
  options: GenerateVisionBoardOptions
): Promise<VisionBoardResultWithTemplate> {
  const {
    goals,
    vibe,
    imageProvider,
    layoutTemplate,
    userName,
    canvasSize,
    backgroundColor,
    openai,
    logoPath,
  } = options;
  
  // ==========================================================================
  // STEP 1: DETERMINE LAYOUT AND CANVAS SIZE
  // ==========================================================================
  
  const validGoals = goals.filter((g) => g.trim() !== "");
  const numGoals = Math.max(2, Math.min(7, validGoals.length)); // Clamp to 2-7 for A4 layout
  
  console.log(`🎯 [ORCHESTRATOR] Processing ${validGoals.length} goals (using ${numGoals} for layout)`);
  
  // Use editorial_grid as default (masonry + text overlays)
  const template = layoutTemplate || "editorial_grid";
  
  // Determine canvas size and background color based on template
  let finalCanvasSize: { width: number; height: number };
  let finalBackgroundColor: string;
  
  if (template === "polaroid_stack") {
    // Use A4 layout system for polaroid_stack
    try {
      const a4Layout = getA4Layout(numGoals);
      finalCanvasSize = canvasSize || A4_CANVAS;
      finalBackgroundColor = backgroundColor || a4Layout.outerBg;
      
      console.log(`📐 [ORCHESTRATOR] Using A4 layout for ${numGoals} goals`);
      console.log(`   - Canvas: ${finalCanvasSize.width}x${finalCanvasSize.height}`);
      console.log(`   - Background: ${finalBackgroundColor}`);
    } catch (error) {
      // Fallback if A4 layout fails
      console.warn(`⚠️  [ORCHESTRATOR] A4 layout error, using fallback:`, error);
      finalCanvasSize = canvasSize || A4_CANVAS;
      finalBackgroundColor = backgroundColor || A4_OUTER_BG[numGoals as GoalCount] || "#0F3F3E";
    }
  } else {
    // editorial_grid (and other legacy layouts): masonry + text slots
    finalCanvasSize = canvasSize || { width: 1654, height: 2339 };
    finalBackgroundColor = backgroundColor || "#F6F4F0";
    console.log(`📐 [ORCHESTRATOR] Using editorial_grid layout`);
    console.log(`   - Canvas: ${finalCanvasSize.width}x${finalCanvasSize.height}`);
  }

  // Generate layout slots
  const layoutSlots = generateLayout(template, finalCanvasSize, numGoals);
  
  const polaroidSlots = layoutSlots.filter(s => s.type === "polaroid" || (s.type === "image" && s.goalIndex !== undefined && s.kind !== "background"));
  const textSlots = layoutSlots.filter(s => s.type === "text");
  const imageSlots = layoutSlots.filter(s => s.type === "image" && s.kind !== "background");
  
  if (template === "polaroid_stack" && polaroidSlots.length !== numGoals) {
    console.warn(`⚠️  [ORCHESTRATOR] Expected ${numGoals} polaroid slots, got ${polaroidSlots.length}`);
  }
  
  console.log(`📐 [ORCHESTRATOR] Generated ${layoutSlots.length} layout slots (${imageSlots.length} images, ${textSlots.length} text, ${polaroidSlots.length} polaroids)`);

  // ==========================================================================
  // STEP 2: GENERATE IMAGE SEARCH QUERIES
  // ==========================================================================
  
  const userGoals: UserGoals = { goals: validGoals, vibe };
  console.log("🔍 [ORCHESTRATOR] Generating search queries...");
  const searchQueries = await generateImageSearchQueries(openai, userGoals);
  console.log(`✅ [ORCHESTRATOR] Generated ${searchQueries.length} search queries`);

  // ==========================================================================
  // STEP 3: FETCH IMAGES FROM PROVIDER
  // ==========================================================================
  
  console.log("🖼️  [ORCHESTRATOR] Fetching images from provider...");
  const allImagesWithGoals = await imageProvider.searchImagesWithGoals(searchQueries);
  console.log(`✅ [ORCHESTRATOR] Fetched ${allImagesWithGoals.length} images with goal metadata`);

  if (allImagesWithGoals.length === 0) {
    console.error("❌ [ORCHESTRATOR] No images found for the given goals");
    throw new Error("No images found for the given goals");
  }

  // ==========================================================================
  // STEP 4: SELECT BEST IMAGES (OpenAI ranking or fallback)
  // ==========================================================================
  
  let selectedImages: ImageWithGoal[] = [];
  let backgroundImage: ImageAsset | undefined;
  
  // Group images by goal
  const imagesByGoal = new Map<number, ImageWithGoal[]>();
  for (const img of allImagesWithGoals) {
    const goalIdx = img.goalIndex;
    if (goalIdx >= 0 && goalIdx < numGoals) {
      if (!imagesByGoal.has(goalIdx)) {
        imagesByGoal.set(goalIdx, []);
      }
      imagesByGoal.get(goalIdx)!.push(img);
    }
  }
  
  // Sort images within each goal by relevance score
  for (const [, images] of imagesByGoal.entries()) {
    images.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }
  
  if (template === "editorial_grid") {
    // Editorial grid: select up to 30 images (by relevance), no background image
    const maxImages = Math.min(30, imageSlots.length, allImagesWithGoals.length);
    const sortedByRelevance = [...allImagesWithGoals].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    selectedImages = sortedByRelevance.slice(0, maxImages).map((img, idx) => ({ ...img, goalIndex: idx }));
    console.log(`📸 [ORCHESTRATOR] Selected ${selectedImages.length} images for editorial grid`);
  } else if (template === "polaroid_stack") {
    console.log("🎯 [ORCHESTRATOR] Using OpenAI intent ranking for image selection...");
    
    // Prepare goals array for ranking
    const goalsForRanking = validGoals.slice(0, numGoals).map((goalText, idx) => ({
      id: `goal-${idx}`,
      text: goalText,
    }));
    
    // Prepare candidates
    const allImagesSorted = [...allImagesWithGoals].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    const backgroundCandidates = allImagesSorted.map(img => ({
      id: img.id,
      url: img.url,
      photographer: img.photographer,
      alt: img.alt,
      width: img.width,
      height: img.height,
      avg_color: undefined,
      src: {
        large: img.url,
        original: img.downloadUrl || img.url,
      },
    }));
    
    const goalCandidatesByGoal: Record<string, typeof backgroundCandidates> = {};
    for (let i = 0; i < numGoals; i++) {
      const goalId = `goal-${i}`;
      const images = imagesByGoal.get(i) || [];
      goalCandidatesByGoal[goalId] = images
        .filter(img => img.id && img.url)
        .map(img => ({
          id: img.id!,
          url: img.url!,
          photographer: img.photographer,
          alt: img.alt,
          width: img.width || 0,
          height: img.height || 0,
          avg_color: undefined,
          src: {
            large: img.url!,
            original: img.downloadUrl || img.url!,
          },
        }));
    }
    
    // Call OpenAI ranking
    const rankedSelection = await selectBestImagesWithOpenAI(
      openai,
      goalsForRanking,
      backgroundCandidates,
      goalCandidatesByGoal
    );
    
    console.log(`✅ [ORCHESTRATOR] OpenAI ranking complete`);
    
    // Map selections to images
    const backgroundCandidate = allImagesWithGoals.find(img => img.id === rankedSelection.background.id);
    if (backgroundCandidate) {
      backgroundImage = {
        id: backgroundCandidate.id,
        url: backgroundCandidate.url,
        width: backgroundCandidate.width,
        height: backgroundCandidate.height,
        photographer: backgroundCandidate.photographer,
        source: backgroundCandidate.source,
        downloadUrl: backgroundCandidate.downloadUrl,
      };
    }
    
    // Find goal images
    for (const goalSelection of rankedSelection.goals) {
      const goalId = goalSelection.goalId || "";
      const goalIdx = parseInt(goalId.replace("goal-", ""));
      
      if (isNaN(goalIdx) || goalIdx < 0 || goalIdx >= numGoals) continue;
      
      const image = allImagesWithGoals.find(img => img.id === goalSelection.imageId);
      if (image) {
        selectedImages.push(image);
      } else {
        // Fallback: use first image for this goal
        const goalImages = imagesByGoal.get(goalIdx) || [];
        if (goalImages.length > 0) {
          selectedImages.push(goalImages[0]);
        }
      }
    }
    
    // Fill gaps if needed
    for (let i = 0; i < numGoals; i++) {
      const hasImage = selectedImages.some(img => img.goalIndex === i);
      if (!hasImage) {
        const goalImages = imagesByGoal.get(i) || [];
        if (goalImages.length > 0) {
          selectedImages.push(goalImages[0]);
          console.log(`   - Added fallback for goal ${i}`);
        }
      }
    }
    
    // Sort by goal index
    selectedImages.sort((a, b) => a.goalIndex - b.goalIndex);
    
  } else {
    // Legacy mode
    console.log("📊 [ORCHESTRATOR] Using legacy selection...");
    
    for (let i = 0; i < numGoals; i++) {
      const goalImages = imagesByGoal.get(i) || [];
      if (goalImages.length > 0) {
        selectedImages.push(goalImages[0]);
      }
    }
  }

  // Convert to ImageAsset[]
  const allImages = selectedImages.map((img) => ({
    id: img.id,
    url: img.url,
    width: img.width,
    height: img.height,
    photographer: img.photographer,
    source: img.source,
    downloadUrl: img.downloadUrl,
  }));

  console.log(`📸 [ORCHESTRATOR] Selected ${allImages.length} images for composition`);

  // ==========================================================================
  // STEP 5 & 6: GENERATE TEXT FOR BOARD (editorial = affirmations only; polaroid = quotes + affirmations)
  // ==========================================================================
  
  let goalQuotes: string[] = [];
  let textBlocks: TextBlock[];

  if (template === "editorial_grid") {
    // Editorial grid: only affirmations for text overlays (no polaroid, so no goal quotes)
    console.log("✍️  [ORCHESTRATOR] Generating affirmations for editorial grid...");
    textBlocks = await generateMotivationalText(openai, userGoals);
    console.log(`✅ [ORCHESTRATOR] Generated ${textBlocks.length} affirmations`);
  } else {
    // Polaroid stack: goal quotes + affirmations (not used for current Lambda default)
    console.log("✍️  [ORCHESTRATOR] Generating goal quotes and affirmations...");
    [goalQuotes, textBlocks] = await Promise.all([
      generateGoalQuotes(openai, validGoals.slice(0, numGoals)),
      generateMotivationalText(openai, userGoals),
    ]);
    console.log(`✅ [ORCHESTRATOR] Generated ${goalQuotes.length} goal quotes, ${textBlocks.length} affirmations`);
  }

  // ==========================================================================
  // STEP 7: BUILD VISION BOARD ASSETS (stable mapping)
  // ==========================================================================
  
  let visionBoardAssets: VisionBoardAssets | undefined;
  
  if (template === "polaroid_stack") {
    console.log("🔗 [ORCHESTRATOR] Building VisionBoardAssets with stable mapping...");
    
    const cards: GoalCard[] = [];
    for (let i = 0; i < numGoals; i++) {
      const goalText = validGoals[i];
      const quoteText = goalQuotes[i] || goalText;
      const imageForGoal = selectedImages.find(img => img.goalIndex === i);
      
      if (imageForGoal) {
        cards.push({
          goalIndex: i,
          goalText,
          quoteText,
          imageUrl: imageForGoal.url,
          imageId: imageForGoal.id,
          imageDownloadUrl: imageForGoal.downloadUrl,
        });
        console.log(`   ✅ Card ${i}: "${goalText.substring(0, 20)}..." -> "${quoteText.substring(0, 25)}..."`);
      } else {
        // Fallback
        const fallbackImage = selectedImages[0] || allImagesWithGoals[0];
        if (fallbackImage) {
          cards.push({
            goalIndex: i,
            goalText,
            quoteText,
            imageUrl: fallbackImage.url,
            imageId: fallbackImage.id,
            imageDownloadUrl: fallbackImage.downloadUrl,
          });
          console.warn(`   ⚠️  Card ${i}: Using fallback image`);
        }
      }
    }
    
    cards.sort((a, b) => a.goalIndex - b.goalIndex);
    
    // Background URL (NOT used in A4 mode - we use solid colors instead)
    const allImagesSorted = [...allImagesWithGoals].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    const backgroundUrl = backgroundImage?.url || allImagesSorted[0]?.url || "";
    const backgroundId = backgroundImage?.id || allImagesSorted[0]?.id;
    const backgroundDownloadUrl = backgroundImage?.downloadUrl || allImagesSorted[0]?.downloadUrl;
    
    visionBoardAssets = {
      backgroundUrl,
      backgroundId,
      backgroundDownloadUrl,
      cards,
    };
    
    console.log(`✅ [ORCHESTRATOR] Built VisionBoardAssets: ${cards.length} cards`);
  }

  // ==========================================================================
  // STEP 8: LOAD LOGO (PNG for Lambda compatibility)
  // ==========================================================================
  
  let logoBuffer: Buffer | undefined;
  
  // Editorial grid has light background → use black logo; polaroid has colored frame → use white logo
  const logoPaths = [
    logoPath,
    template === "editorial_grid"
      ? join(process.cwd(), "public", "rank-logo-black.png")
      : join(process.cwd(), "public", "rank-logo-white.png"),
    template === "editorial_grid"
      ? join(process.cwd(), "public", "rank-logo-black.svg")
      : join(process.cwd(), "public", "rank-logo-white.svg"),
    join(process.cwd(), "assets", "rank-logo.png"),
  ].filter(Boolean) as string[];
  
  for (const path of logoPaths) {
    try {
      logoBuffer = await readFile(path);
      console.log(`✅ [ORCHESTRATOR] Loaded logo from ${path}`);
      break;
    } catch {
      continue;
    }
  }
  
  if (!logoBuffer) {
    console.warn("⚠️  [ORCHESTRATOR] Could not load logo from any path");
  }

  // ==========================================================================
  // STEP 9: COMPOSE CANVAS
  // ==========================================================================
  
  const canvasConfig: CanvasConfig = {
    width: finalCanvasSize.width,
    height: finalCanvasSize.height,
    backgroundColor: finalBackgroundColor,
    userName: userName || undefined,
  };

  console.log("🎨 [ORCHESTRATOR] Starting canvas composition...");
  
  const composition = await composeCanvas(
    canvasConfig,
    layoutSlots,
    allImages,
    textBlocks,
    logoBuffer,
    backgroundImage, // Not used in A4 mode (solid color background)
    goalQuotes,
    visionBoardAssets
  );

  console.log(`✅ [ORCHESTRATOR] Vision board complete: ${composition.width}x${composition.height}`);

  return {
    imageBuffer: composition.imageBuffer,
    width: composition.width,
    height: composition.height,
    imagesUsed: allImages,
    textBlocks,
    layoutTemplate: template,
  };
}

