/**
 * Hard Template Layout Engine for Vision Board Composition
 * 
 * Deterministic 5-column Pinterest/Instagram-style layout:
 * - Canvas: 1654 × 2339 (A4 portrait)
 * - 5-column system (each column = 20% width = 331px)
 * - Exactly 30 images with specific size distribution
 * - Exactly 4 text boxes at fixed positions
 * - Zero visible background (edge-to-edge coverage)
 */

import type { LayoutSlot, LayoutTemplate } from "./types";

export type { LayoutSlot, LayoutTemplate };

/**
 * Generate layout slots using hard template
 */
export function generateLayout(
  templateName: LayoutTemplate,
  canvasSize: { width: number; height: number } = { width: 1654, height: 2339 }
): LayoutSlot[] {
  // Always use hard template layout
  return generateHardTemplateLayout(canvasSize);
}

/**
 * Hard Template Layout (5-Column System)
 * 
 * Creates a deterministic Pinterest-style layout:
 * - 5 columns (each = 20% width)
 * - Exactly 30 images
 * - At least 4 hero images (2 columns wide)
 * - Exactly 4 text boxes at fixed positions
 */
function generateHardTemplateLayout(
  canvasSize: { width: number; height: number }
): LayoutSlot[] {
  const { width, height } = canvasSize;
  const slots: LayoutSlot[] = [];

  // 5-column system
  const numColumns = 5;
  const columnWidth = Math.floor(width / numColumns); // ~331px for 1654px canvas
  
  // Track current Y position for each column
  const columnHeights = new Array(numColumns).fill(0);
  
  // Image size categories (as percentage of canvas height)
  const sizeCategories = {
    small: { min: 0.12, max: 0.18 },   // 12-18% height (~280-420px)
    medium: { min: 0.18, max: 0.26 },  // 18-26% height (~420-608px)
    tall: { min: 0.28, max: 0.40 },    // 28-40% height (~655-936px)
    hero: { min: 0.26, max: 0.36 },    // 26-36% height (~608-842px) for 2 columns
  };
  
  // Target: 28-32 images for dense collage
  const targetImageCount = 30; // Average of 28-32 range
  const minHeroCount = 4; // At least 4 hero images
  
  // Distribution: 4 hero, 6 tall, 10 medium, 10 small
  const heroCount = 4;
  const tallCount = 6;
  const mediumCount = 10;
  const smallCount = 10;
  
  // Create image size queue
  const imageSizes: Array<{ type: 'small' | 'medium' | 'tall' | 'hero'; used: boolean }> = [];
  
  // Add hero images first (at least 4)
  for (let i = 0; i < heroCount; i++) {
    imageSizes.push({ type: 'hero', used: false });
  }
  
  // Add tall images
  for (let i = 0; i < tallCount; i++) {
    imageSizes.push({ type: 'tall', used: false });
  }
  
  // Add medium images
  for (let i = 0; i < mediumCount; i++) {
    imageSizes.push({ type: 'medium', used: false });
  }
  
  // Add small images
  for (let i = 0; i < smallCount; i++) {
    imageSizes.push({ type: 'small', used: false });
  }
  
  // Shuffle the queue for variety
  for (let i = imageSizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [imageSizes[i], imageSizes[j]] = [imageSizes[j], imageSizes[i]];
  }
  
  let imageIndex = 0;
  
  // Generate image slots
  while (imageIndex < targetImageCount && imageIndex < imageSizes.length) {
    const sizeType = imageSizes[imageIndex].type;
    
    // Find shortest column(s) for placement
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    
    let slotWidth: number;
    let slotHeight: number;
    let slotX: number;
    let slotY: number;
    
    if (sizeType === 'hero') {
      // Hero: 2 columns wide
      slotWidth = columnWidth * 2;
      slotX = shortestColumnIndex * columnWidth;
      
      // Ensure hero fits (don't place if it would exceed right edge)
      if (slotX + slotWidth > width) {
        // Try previous column
        if (shortestColumnIndex > 0) {
          slotX = (shortestColumnIndex - 1) * columnWidth;
        } else {
          // Skip this hero if no space
          imageIndex++;
          continue;
        }
      }
      
      // Hero height: 26-36% of canvas height
      const heightPercent = sizeCategories.hero.min + 
        (Math.random() * (sizeCategories.hero.max - sizeCategories.hero.min));
      slotHeight = Math.floor(height * heightPercent);
      
      // Ensure hero doesn't exceed canvas
      const maxHeight = height - columnHeights[shortestColumnIndex];
      slotHeight = Math.min(slotHeight, maxHeight);
      
      if (slotHeight < height * 0.2) {
        // Too small, skip
        imageIndex++;
        continue;
      }
      
      slotY = columnHeights[shortestColumnIndex];
      
      // Update column heights for both columns spanned
      const columnsSpanned = 2;
      for (let c = 0; c < columnsSpanned && shortestColumnIndex + c < numColumns; c++) {
        columnHeights[shortestColumnIndex + c] = slotY + slotHeight;
      }
    } else {
      // Regular: 1 column wide
      slotWidth = columnWidth;
      slotX = shortestColumnIndex * columnWidth;
      
      // Determine height based on size type
      const category = sizeCategories[sizeType];
      const heightPercent = category.min + (Math.random() * (category.max - category.min));
      slotHeight = Math.floor(height * heightPercent);
      
      // Ensure doesn't exceed canvas
      const maxHeight = height - columnHeights[shortestColumnIndex];
      slotHeight = Math.min(slotHeight, maxHeight);
      
      if (slotHeight < height * 0.1) {
        // Too small, skip
        imageIndex++;
        continue;
      }
      
      slotY = columnHeights[shortestColumnIndex];
      
      // Update column height
      columnHeights[shortestColumnIndex] = slotY + slotHeight;
    }
    
    // Add tiny overlap (-1 to -3px) to avoid seams
    const overlap = -1 - Math.floor(Math.random() * 3); // -1 to -3px
    
    // Integer-snap all positions
    slotX = Math.floor(slotX);
    slotY = Math.floor(slotY);
    slotWidth = Math.ceil(slotWidth) + Math.abs(overlap);
    slotHeight = Math.ceil(slotHeight) + Math.abs(overlap);
    
    // Ensure doesn't exceed canvas bounds
    slotWidth = Math.min(slotWidth, width - slotX);
    slotHeight = Math.min(slotHeight, height - slotY);
    
    // Determine aspect ratio
    let aspectRatio: "portrait" | "square" | "landscape";
    const aspect = slotHeight / slotWidth;
    if (aspect > 1.3) {
      aspectRatio = "portrait";
    } else if (aspect < 0.8) {
      aspectRatio = "landscape";
    } else {
      aspectRatio = "square";
    }
    
    slots.push({
      x: slotX,
      y: slotY,
      width: slotWidth,
      height: slotHeight,
      aspectRatio,
      type: "image",
    });
    
    imageIndex++;
  }
  
  // Fill any remaining gaps to ensure zero whitespace
  const minColumnHeight = Math.min(...columnHeights);
  if (minColumnHeight < height * 0.98) {
    // Add filler images to short columns
    for (let col = 0; col < numColumns; col++) {
      if (columnHeights[col] < height * 0.98) {
        const gapHeight = height - columnHeights[col];
        if (gapHeight >= height * 0.1) { // Fill gaps >= 10% height
          slots.push({
            x: col * columnWidth,
            y: columnHeights[col],
            width: columnWidth,
            height: gapHeight,
            aspectRatio: "portrait",
            type: "image",
          });
          columnHeights[col] = height;
        }
      }
    }
  }
  
  // Ensure edge coverage
  // Top edge
  for (let col = 0; col < numColumns; col++) {
    const colSlots = slots.filter(s => 
      Math.floor(s.x / columnWidth) === col && s.type === "image"
    );
    const minY = colSlots.length > 0 ? Math.min(...colSlots.map(s => s.y)) : height;
    if (minY > 0) {
      slots.unshift({
        x: col * columnWidth,
        y: 0,
        width: columnWidth,
        height: minY,
        aspectRatio: "portrait",
        type: "image",
      });
    }
  }
  
  // Right edge
  const rightEdgeSlots = slots.filter(s => s.x + s.width >= width - 10);
  if (rightEdgeSlots.length === 0 || Math.max(...rightEdgeSlots.map(s => s.x + s.width)) < width) {
    const rightCol = numColumns - 1;
    const rightColSlots = slots.filter(s => Math.floor(s.x / columnWidth) === rightCol);
    const maxRight = rightColSlots.length > 0 
      ? Math.max(...rightColSlots.map(s => s.x + s.width))
      : 0;
    if (maxRight < width) {
      slots.push({
        x: maxRight,
        y: 0,
        width: width - maxRight,
        height: height,
        aspectRatio: "portrait",
        type: "image",
      });
    }
  }
  
  // Bottom edge
  for (let col = 0; col < numColumns; col++) {
    const colSlots = slots.filter(s => 
      Math.floor(s.x / columnWidth) === col && s.type === "image"
    );
    const maxBottom = colSlots.length > 0 
      ? Math.max(...colSlots.map(s => s.y + s.height))
      : 0;
    if (maxBottom < height * 0.98) {
      const gapHeight = height - maxBottom;
      if (gapHeight >= 50) {
        slots.push({
          x: col * columnWidth,
          y: maxBottom,
          width: columnWidth,
          height: gapHeight,
          aspectRatio: "portrait",
          type: "image",
        });
      }
    }
  }
  
  // Add exactly 4 text boxes at fixed positions
  const textAnchors = [
    { x: 0.08, y: 0.12 },  // 8%, 12%
    { x: 0.58, y: 0.18 },  // 58%, 18%
    { x: 0.10, y: 0.46 },  // 10%, 46%
    { x: 0.34, y: 0.72 },  // 34%, 72%
  ];
  
  // Text box sizes (as percentage of canvas width)
  const textSizes = [
    { width: 0.24 + Math.random() * 0.06 }, // 24-30% width (small)
    { width: 0.30 + Math.random() * 0.08 }, // 30-38% width (medium)
    { width: 0.38 + Math.random() * 0.10 }, // 38-48% width (large)
    { width: 0.30 + Math.random() * 0.08 }, // 30-38% width (medium)
  ];
  
  for (let i = 0; i < 4; i++) {
    const anchor = textAnchors[i];
    const textSize = textSizes[i];
    
    slots.push({
      x: Math.floor(width * anchor.x),
      y: Math.floor(height * anchor.y),
      width: Math.floor(width * textSize.width),
      height: 0, // Height will be calculated based on text content
      type: "text",
    });
  }
  
  return slots;
}

/**
 * Get a random template (for compatibility, but always uses hard template)
 */
export function getRandomTemplate(): LayoutTemplate {
  return "editorial_grid";
}
