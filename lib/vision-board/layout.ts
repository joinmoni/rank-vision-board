/**
 * A4 Portrait Layout Engine for Vision Board Composition
 * 
 * Deterministic A4 portrait layouts for 2-7 goals:
 * - Canvas: 1654 × 2339 (A4 portrait at 200 DPI)
 * - Outer colored background (varies by goal count)
 * - Inner neutral board area (#F6F4F0)
 * - Polaroid placements matching reference templates
 * - Title text at top-left
 * - Rank logo at bottom-right
 */

import type { LayoutSlot, LayoutTemplate } from "./types";

export type { LayoutSlot, LayoutTemplate };

// =============================================================================
// A4 CANVAS CONSTANTS
// =============================================================================

export type GoalCount = 2 | 3 | 4 | 5 | 6 | 7;

export const A4_CANVAS = { width: 1654, height: 2339 };

export const A4_FRAME = {
  outerPadX: 110,
  outerPadTop: 210,   // Room for title
  outerPadBottom: 160, // Room for logo
  innerBg: "#F6F4F0",
};

// Background colors per goal count (outer frame color)
export const A4_OUTER_BG: Record<GoalCount, string> = {
  2: "#0F3F3E", // teal
  3: "#6B3B06", // brown
  4: "#2B1611", // deep brown
  5: "#0F3F3E", // teal
  6: "#F57C00", // orange
  7: "#4A0A0A", // maroon
};

// =============================================================================
// POLAROID SLOT TYPE & LAYOUTS
// =============================================================================

export type PolaroidSlot = {
  goalIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
};

/**
 * A4 Layouts for 2-7 goals
 * 
 * Coordinate system:
 * - All x/y/w/h are expressed in pixels within the INNER BOARD area
 * - Inner board: 1434 x 1969 (after outer padding)
 * - When compositing, convert to absolute coords:
 *   absX = innerRect.x + slot.x
 *   absY = innerRect.y + slot.y
 */
export const A4_LAYOUTS: Record<GoalCount, PolaroidSlot[]> = {
  // INNER BOARD size: innerW = 1654 - 2*110 = 1434, innerH = 2339 - 210 - 160 = 1969

  2: [
    { goalIndex: 0, x: 100, y: 380, w: 620, h: 780, rot: -6, z: 2 },
    { goalIndex: 1, x: 640, y: 640, w: 620, h: 780, rot: 6, z: 3 },
  ],

  3: [
    { goalIndex: 0, x: 80, y: 200, w: 520, h: 660, rot: -5, z: 2 },
    { goalIndex: 1, x: 780, y: 200, w: 520, h: 660, rot: 5, z: 2 },
    { goalIndex: 2, x: 420, y: 880, w: 520, h: 660, rot: 0, z: 3 },
  ],

  4: [
    { goalIndex: 0, x: 100, y: 180, w: 520, h: 660, rot: -4, z: 2 },
    { goalIndex: 1, x: 780, y: 180, w: 520, h: 660, rot: 4, z: 2 },
    { goalIndex: 2, x: 100, y: 900, w: 520, h: 660, rot: 3, z: 3 },
    { goalIndex: 3, x: 780, y: 900, w: 520, h: 660, rot: -3, z: 3 },
  ],

  5: [
    { goalIndex: 0, x: 60, y: 180, w: 430, h: 560, rot: -4, z: 2 },
    { goalIndex: 1, x: 500, y: 100, w: 430, h: 560, rot: 0, z: 3 },
    { goalIndex: 2, x: 940, y: 180, w: 430, h: 560, rot: 4, z: 2 },
    { goalIndex: 3, x: 260, y: 800, w: 430, h: 560, rot: 3, z: 3 },
    { goalIndex: 4, x: 720, y: 800, w: 430, h: 560, rot: -3, z: 3 },
  ],

  6: [
    { goalIndex: 0, x: 60, y: 200, w: 420, h: 540, rot: -4, z: 2 },
    { goalIndex: 1, x: 500, y: 120, w: 420, h: 540, rot: 1, z: 3 },
    { goalIndex: 2, x: 940, y: 200, w: 420, h: 540, rot: 4, z: 2 },
    { goalIndex: 3, x: 60, y: 820, w: 420, h: 540, rot: 3, z: 3 },
    { goalIndex: 4, x: 500, y: 900, w: 420, h: 540, rot: -1, z: 4 },
    { goalIndex: 5, x: 940, y: 820, w: 420, h: 540, rot: -3, z: 3 },
  ],

  7: [
    { goalIndex: 0, x: 420, y: 140, w: 520, h: 660, rot: 0, z: 4 }, // hero center
    { goalIndex: 1, x: 50, y: 160, w: 380, h: 500, rot: -5, z: 2 },
    { goalIndex: 2, x: 960, y: 160, w: 380, h: 500, rot: 5, z: 2 },
    { goalIndex: 3, x: 80, y: 720, w: 380, h: 500, rot: 4, z: 3 },
    { goalIndex: 4, x: 960, y: 720, w: 380, h: 500, rot: -4, z: 3 },
    { goalIndex: 5, x: 260, y: 1280, w: 380, h: 500, rot: -3, z: 2 },
    { goalIndex: 6, x: 720, y: 1280, w: 380, h: 500, rot: 3, z: 2 },
  ],
};

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Get the inner board rectangle dimensions
 */
export function getA4InnerBoardRect() {
  const innerX = A4_FRAME.outerPadX;
  const innerY = A4_FRAME.outerPadTop;
  const innerW = A4_CANVAS.width - 2 * A4_FRAME.outerPadX;
  const innerH = A4_CANVAS.height - A4_FRAME.outerPadTop - A4_FRAME.outerPadBottom;
  return { innerX, innerY, innerW, innerH };
}

/**
 * Get complete A4 layout for a given goal count
 */
export function getA4Layout(goalCount: number) {
  if (goalCount < 2 || goalCount > 7) {
    throw new Error(`A4 layout supports 2–7 goals. got=${goalCount}`);
  }
  const count = goalCount as GoalCount;
  return {
    canvas: A4_CANVAS,
    frame: A4_FRAME,
    outerBg: A4_OUTER_BG[count],
    polaroids: A4_LAYOUTS[count],
    innerRect: getA4InnerBoardRect(),
  };
}

// =============================================================================
// LEGACY LAYOUT GENERATION (kept for backwards compatibility)
// =============================================================================

/**
 * Generate layout slots
 * For polaroid_stack template, uses the new A4 layout system
 */
export function generateLayout(
  templateName: LayoutTemplate,
  canvasSize: { width: number; height: number } = { width: 1654, height: 2339 },
  goalCount?: number
): LayoutSlot[] {
  if (templateName === "polaroid_stack") {
    return generateA4PolaroidLayout(goalCount || 2);
  }
  // Legacy hard template layout
  return generateHardTemplateLayout(canvasSize);
}

/**
 * Generate A4 polaroid layout slots from new layout system
 */
function generateA4PolaroidLayout(goalCount: number): LayoutSlot[] {
  const numGoals = Math.max(2, Math.min(7, goalCount));
  const a4Layout = getA4Layout(numGoals);
  const { innerX, innerY } = a4Layout.innerRect;
  
  const slots: LayoutSlot[] = [];

  // Background slot (for outer colored background)
  slots.push({
    x: 0,
    y: 0,
    width: a4Layout.canvas.width,
    height: a4Layout.canvas.height,
    type: "image",
    kind: "background",
    role: "background",
    zIndex: 0,
    rotation: 0,
  });

  // Create polaroid slots from A4 layout
  // Sort by z-index for proper layering
  const sortedPolaroids = [...a4Layout.polaroids].sort((a, b) => a.z - b.z);
  
  for (const polaroid of sortedPolaroids) {
    slots.push({
      // Convert to absolute canvas coordinates
      x: innerX + polaroid.x,
      y: innerY + polaroid.y,
      width: polaroid.w,
      height: polaroid.h,
      aspectRatio: "portrait",
      type: "polaroid",
      kind: "image",
      zIndex: polaroid.z,
      rotation: polaroid.rot,
      goalIndex: polaroid.goalIndex,
    });
  }

  return slots;
}

// =============================================================================
// LEGACY: Hard Template Layout (5-Column System)
// Kept for backwards compatibility with non-polaroid templates
// =============================================================================

function generateHardTemplateLayout(
  canvasSize: { width: number; height: number }
): LayoutSlot[] {
  const { width, height } = canvasSize;
  const slots: LayoutSlot[] = [];

  const numColumns = 5;
  const columnWidth = Math.floor(width / numColumns);
  const columnHeights = new Array(numColumns).fill(0);
  
  const sizeCategories = {
    small: { min: 0.12, max: 0.18 },
    medium: { min: 0.18, max: 0.26 },
    tall: { min: 0.28, max: 0.40 },
    hero: { min: 0.26, max: 0.36 },
  };
  
  const targetImageCount = 30;
  const heroCount = 4;
  const tallCount = 6;
  const mediumCount = 10;
  const smallCount = 10;
  
  const imageSizes: Array<{ type: 'small' | 'medium' | 'tall' | 'hero'; used: boolean }> = [];
  
  for (let i = 0; i < heroCount; i++) {
    imageSizes.push({ type: 'hero', used: false });
  }
  for (let i = 0; i < tallCount; i++) {
    imageSizes.push({ type: 'tall', used: false });
  }
  for (let i = 0; i < mediumCount; i++) {
    imageSizes.push({ type: 'medium', used: false });
  }
  for (let i = 0; i < smallCount; i++) {
    imageSizes.push({ type: 'small', used: false });
  }
  
  // Shuffle
  for (let i = imageSizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [imageSizes[i], imageSizes[j]] = [imageSizes[j], imageSizes[i]];
  }
  
  let imageIndex = 0;
  
  while (imageIndex < targetImageCount && imageIndex < imageSizes.length) {
    const sizeType = imageSizes[imageIndex].type;
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    
    let slotWidth: number;
    let slotHeight: number;
    let slotX: number;
    let slotY: number;
    
    if (sizeType === 'hero') {
      slotWidth = columnWidth * 2;
      slotX = shortestColumnIndex * columnWidth;
      
      if (slotX + slotWidth > width) {
        if (shortestColumnIndex > 0) {
          slotX = (shortestColumnIndex - 1) * columnWidth;
        } else {
          imageIndex++;
          continue;
        }
      }
      
      const heightPercent = sizeCategories.hero.min + 
        (Math.random() * (sizeCategories.hero.max - sizeCategories.hero.min));
      slotHeight = Math.floor(height * heightPercent);
      
      const maxHeight = height - columnHeights[shortestColumnIndex];
      slotHeight = Math.min(slotHeight, maxHeight);
      
      if (slotHeight < height * 0.2) {
        imageIndex++;
        continue;
      }
      
      slotY = columnHeights[shortestColumnIndex];
      
      const columnsSpanned = 2;
      for (let c = 0; c < columnsSpanned && shortestColumnIndex + c < numColumns; c++) {
        columnHeights[shortestColumnIndex + c] = slotY + slotHeight;
      }
    } else {
      slotWidth = columnWidth;
      slotX = shortestColumnIndex * columnWidth;
      
      const category = sizeCategories[sizeType];
      const heightPercent = category.min + (Math.random() * (category.max - category.min));
      slotHeight = Math.floor(height * heightPercent);
      
      const maxHeight = height - columnHeights[shortestColumnIndex];
      slotHeight = Math.min(slotHeight, maxHeight);
      
      if (slotHeight < height * 0.1) {
        imageIndex++;
        continue;
      }
      
      slotY = columnHeights[shortestColumnIndex];
      columnHeights[shortestColumnIndex] = slotY + slotHeight;
    }
    
    const overlap = -1 - Math.floor(Math.random() * 3);
    
    slotX = Math.floor(slotX);
    slotY = Math.floor(slotY);
    slotWidth = Math.ceil(slotWidth) + Math.abs(overlap);
    slotHeight = Math.ceil(slotHeight) + Math.abs(overlap);
    
    slotWidth = Math.min(slotWidth, width - slotX);
    slotHeight = Math.min(slotHeight, height - slotY);
    
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
  
  // Fill gaps and add text boxes (legacy behavior)
  const textAnchors = [
    { x: 0.08, y: 0.12 },
    { x: 0.58, y: 0.18 },
    { x: 0.10, y: 0.46 },
    { x: 0.34, y: 0.72 },
  ];
  
  const textSizes = [
    { width: 0.24 + Math.random() * 0.06 },
    { width: 0.30 + Math.random() * 0.08 },
    { width: 0.38 + Math.random() * 0.10 },
    { width: 0.30 + Math.random() * 0.08 },
  ];
  
  for (let i = 0; i < 4; i++) {
    const anchor = textAnchors[i];
    const textSize = textSizes[i];
    
    slots.push({
      x: Math.floor(width * anchor.x),
      y: Math.floor(height * anchor.y),
      width: Math.floor(width * textSize.width),
      height: 0,
      type: "text",
    });
  }
  
  return slots;
}

/**
 * Get a random template (for compatibility)
 */
export function getRandomTemplate(): LayoutTemplate {
  return "editorial_grid";
}

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use getA4Layout() instead for polaroid mode
 */
export function getGoldenPolaroidLayout(count: number): Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}> {
  const n = Math.max(2, Math.min(7, count));
  const a4Layout = getA4Layout(n);
  const { innerX, innerY } = a4Layout.innerRect;
  
  return a4Layout.polaroids.map(p => ({
    x: innerX + p.x,
    y: innerY + p.y,
    width: p.w,
    height: p.h,
    rotation: p.rot,
  }));
}
