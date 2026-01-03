/**
 * Dense Tiling Layout Engine for Vision Board Composition
 * 
 * Creates edge-to-edge, gap-free layouts similar to Pinterest mood boards.
 * Images must touch each other with zero visible whitespace.
 * Includes hero tiles and micro-overlaps for authentic collage feel.
 */

import type { LayoutSlot, LayoutTemplate } from "./types";

export type { LayoutSlot, LayoutTemplate };

/**
 * Generate dense tiled layout slots for images
 * Uses masonry-style column layout with hero tiles and micro-overlaps
 */
export function generateLayout(
  templateName: LayoutTemplate,
  canvasSize: { width: number; height: number } = { width: 2048, height: 2048 }
): LayoutSlot[] {
  // Always use dense tiling layout (no templates needed)
  return generateDenseTiledLayout(canvasSize);
}

/**
 * Dense Tiled Layout (Masonry Style with Hero Tiles)
 * 
 * Creates a Pinterest-style layout where images:
 * - Touch edge-to-edge
 * - Fill entire canvas
 * - Have no gaps or padding
 * - Use variable heights in columns
 * - Include hero tiles (1.5-2 columns wide)
 * - Have micro-overlaps (0-12px) for collage feel
 */
function generateDenseTiledLayout(
  canvasSize: { width: number; height: number }
): LayoutSlot[] {
  const { width, height } = canvasSize;
  const slots: LayoutSlot[] = [];

  // Use 4 columns for optimal density
  const numColumns = 4;
  const columnWidth = Math.floor(width / numColumns);
  
  // Track current Y position for each column
  const columnHeights = new Array(numColumns).fill(0);
  
  // Target: 25-30 images to ensure complete coverage (no white spaces)
  const targetImageCount = 28;
  const heroTileCount = Math.floor(targetImageCount * 0.15); // 15% hero tiles (4-5 images)
  
  // Generate slots using masonry algorithm with hero tiles
  let heroTilesCreated = 0;
  
  for (let i = 0; i < targetImageCount; i++) {
    // Decide if this should be a hero tile (10-25% of images)
    const isHeroTile = heroTilesCreated < heroTileCount && Math.random() < 0.2;
    
    if (isHeroTile) {
      // Hero tile: 1.5-2 columns wide
      const heroWidth = Math.random() < 0.5 
        ? Math.floor(columnWidth * 1.5) // 1.5 columns
        : Math.floor(columnWidth * 2); // 2 columns
      
      // Find the shortest column for hero tile start
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const startX = shortestColumnIndex * columnWidth;
      
      // Hero tiles are taller (2-3x column width)
      const heroHeight = Math.floor(columnWidth * (2 + Math.random() * 1)); // 2-3x
      const finalHeroHeight = Math.min(heroHeight, height - columnHeights[shortestColumnIndex]);
      
      if (finalHeroHeight < columnWidth * 1.5) {
        // Skip if not enough space
        continue;
      }
      
      // Add micro-overlap variation (0-12px)
      const overlap = Math.floor(Math.random() * 12);
      const heroX = Math.max(0, startX - overlap);
      const heroY = columnHeights[shortestColumnIndex] - Math.floor(overlap / 2);
      
      slots.push({
        x: heroX,
        y: Math.max(0, heroY),
        width: heroWidth + overlap,
        height: finalHeroHeight + Math.floor(overlap / 2),
        aspectRatio: "landscape",
        type: "image",
      });
      
      // Update column heights (hero tile spans multiple columns)
      const columnsSpanned = Math.ceil(heroWidth / columnWidth);
      for (let c = 0; c < columnsSpanned && shortestColumnIndex + c < numColumns; c++) {
        columnHeights[shortestColumnIndex + c] = Math.max(
          columnHeights[shortestColumnIndex + c],
          (heroY >= 0 ? heroY : columnHeights[shortestColumnIndex]) + finalHeroHeight
        );
      }
      
      heroTilesCreated++;
    } else {
      // Regular tile: single column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Calculate position with micro-overlap
      const baseX = shortestColumnIndex * columnWidth;
      const overlap = Math.floor(Math.random() * 12);
      const x = Math.max(0, baseX - overlap);
      const y = columnHeights[shortestColumnIndex] - Math.floor(overlap / 2);
      
      // Variable image heights for organic feel
      // Heights range from 1.2x to 2.5x column width
      const heightMultiplier = 1.2 + (Math.random() * 1.3); // 1.2 to 2.5
      const imageHeight = Math.floor(columnWidth * heightMultiplier);
      
      // Ensure we don't exceed canvas height
      const maxHeight = height - (y >= 0 ? y : columnHeights[shortestColumnIndex]);
      const finalHeight = Math.min(imageHeight, maxHeight);
      
      // If this column is full, skip to next
      if (finalHeight < columnWidth * 0.8) {
        continue;
      }
      
      // Determine aspect ratio type
      let aspectRatio: "portrait" | "square" | "landscape";
      if (heightMultiplier > 1.8) {
        aspectRatio = "portrait";
      } else if (heightMultiplier < 1.4) {
        aspectRatio = "landscape";
      } else {
        aspectRatio = "square";
      }
      
      slots.push({
        x,
        y: Math.max(0, y),
        width: columnWidth + overlap,
        height: finalHeight + Math.floor(overlap / 2),
        aspectRatio,
        type: "image",
      });
      
      // Update column height
      columnHeights[shortestColumnIndex] = (y >= 0 ? y : columnHeights[shortestColumnIndex]) + finalHeight;
    }
    
    // Continue until all columns reach near-full height
    // Ensure we have enough images to cover the canvas
    const minColumnHeight = Math.min(...columnHeights);
    if (minColumnHeight >= height * 0.98) {
      // All columns are nearly full, but continue to fill any remaining gaps
      if (i >= targetImageCount - 5) {
        break; // Only break if we're close to target
      }
    }
  }
  
  // Fill any remaining gaps at the bottom
  const minColumnHeight = Math.min(...columnHeights);
  if (minColumnHeight < height * 0.98) {
    // Add filler images to short columns
    for (let col = 0; col < numColumns; col++) {
      if (columnHeights[col] < height * 0.98) {
        const gapHeight = height - columnHeights[col];
        if (gapHeight >= columnWidth * 0.5) { // Lower threshold to fill smaller gaps
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
  
  // Ensure edge coverage: add edge-filling images if needed
  // Check if first column starts at 0
  const firstSlot = slots.find(s => s.x === 0);
  if (!firstSlot || firstSlot.y > 0) {
    // Add image at top-left edge
    slots.unshift({
      x: 0,
      y: 0,
      width: columnWidth,
      height: firstSlot ? firstSlot.y : columnWidth * 1.5,
      aspectRatio: "portrait",
      type: "image",
    });
  }
  
  // Check if last column reaches right edge
  const rightEdge = width;
  const lastColumnSlots = slots.filter(s => s.x + s.width >= rightEdge - columnWidth);
  if (lastColumnSlots.length === 0 || Math.max(...lastColumnSlots.map(s => s.x + s.width)) < rightEdge) {
    // Add image to fill right edge
    const rightX = rightEdge - columnWidth;
    const rightY = columnHeights[numColumns - 1];
    if (rightY < height * 0.95) {
      slots.push({
        x: rightX,
        y: rightY,
        width: columnWidth,
        height: height - rightY,
        aspectRatio: "portrait",
        type: "image",
      });
    }
  }
  
  // Ensure bottom edge is covered
  const bottomSlots = slots.filter(s => s.y + s.height >= height * 0.95);
  if (bottomSlots.length < numColumns) {
    // Find columns that don't reach bottom
    for (let col = 0; col < numColumns; col++) {
      const colSlots = slots.filter(s => Math.floor(s.x / columnWidth) === col);
      const maxBottom = Math.max(...colSlots.map(s => s.y + s.height), 0);
      if (maxBottom < height * 0.98) {
        const gapHeight = height - maxBottom;
        if (gapHeight >= 50) { // Fill gaps >= 50px
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
  }
  
  // Text overlays disabled for now
  // const textCount = 3;
  // for (let i = 0; i < textCount; i++) {
  //   slots.push({
  //     x: 0,
  //     y: 0,
  //     width: 0,
  //     height: 0,
  //     type: "text",
  //   });
  // }
  
  return slots;
}

/**
 * Get a random template (for compatibility, but always uses dense tiling)
 */
export function getRandomTemplate(): LayoutTemplate {
  return "editorial_grid"; // Doesn't matter, always uses dense tiling
}
