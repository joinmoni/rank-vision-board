/**
 * Canvas Composition System - A4 Portrait Lambda Implementation
 * 
 * Uses Sharp to compose images and text on a canvas.
 * Generates COMPLETE vision board including:
 * - Outer colored background (goal-count-based)
 * - Inner neutral board panel (#F6F4F0)
 * - Title text at top-left: "{name}'s Vision Board"
 * - Rank logo at bottom-right
 * - Polaroid cards with SQUARE photos and captions
 */

import sharp from "sharp";
import { LayoutSlot, ImageAsset, TextBlock, GoalCard, VisionBoardAssets } from "./types";
import { A4_FRAME, A4_CANVAS, getA4InnerBoardRect, PolaroidSlot } from "./layout";
import { readFile } from "fs/promises";
import { join } from "path";
import * as opentype from "opentype.js";

// =============================================================================
// TYPES & CONFIG
// =============================================================================

export type CanvasConfig = {
  width: number;
  height: number;
  backgroundColor: string; // Outer background color
  userName?: string; // User's name for title display
};

export type A4FrameConfig = {
  outerPadX: number;
  outerPadTop: number;
  outerPadBottom: number;
  innerBg: string;
};

export type InnerRectConfig = {
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
};

export type CompositionResult = {
  imageBuffer: Buffer;
  width: number;
  height: number;
};

// =============================================================================
// BUFFER VALIDATION HELPERS
// =============================================================================

/**
 * Check if buffer is PNG format
 */
function isPng(buf: Buffer): boolean {
  return buf?.length > 8 && 
    buf[0] === 0x89 && 
    buf[1] === 0x50 && 
    buf[2] === 0x4E && 
    buf[3] === 0x47;
}

/**
 * Check if buffer is JPEG format
 */
function isJpg(buf: Buffer): boolean {
  return buf?.length > 3 && 
    buf[0] === 0xFF && 
    buf[1] === 0xD8 && 
    buf[2] === 0xFF;
}

/**
 * Check if buffer is a valid raster image (PNG or JPEG)
 * Sharp in Lambda may not support SVG reliably
 */
function isValidRasterBuffer(buf: Buffer): boolean {
  return isPng(buf) || isJpg(buf);
}

/**
 * Log buffer magic bytes for debugging
 */
function logBufferMagicBytes(buf: Buffer, label: string): void {
  if (!buf || buf.length < 8) {
    console.log(`🔍 [CANVAS] ${label}: Buffer too short (${buf?.length || 0} bytes)`);
    return;
  }
  const magicBytes = Array.from(buf.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`🔍 [CANVAS] ${label} magic bytes: ${magicBytes}`);
  
  if (isPng(buf)) {
    console.log(`✅ [CANVAS] ${label}: Valid PNG format`);
  } else if (isJpg(buf)) {
    console.log(`✅ [CANVAS] ${label}: Valid JPEG format`);
  } else {
    console.warn(`⚠️  [CANVAS] ${label}: Unknown/unsupported format`);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b, alpha: 1 };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

function escapeXmlForSvg(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// =============================================================================
// MAIN COMPOSE FUNCTION - A4 LAMBDA VERSION
// =============================================================================

/**
 * Compose a complete A4 vision board for Lambda deployment
 * 
 * Renders the FULL board including:
 * - Outer colored background (varies by goal count)
 * - Inner neutral board panel
 * - Title text: "{name}'s Vision Board"
 * - Polaroid cards with square photos and captions
 * - Rank logo at bottom-right
 */
export async function composeVisionBoard(
  config: CanvasConfig,
  layoutSlots: LayoutSlot[],
  images: ImageAsset[],
  textBlocks: TextBlock[],
  logoBuffer?: Buffer,
  backgroundImage?: ImageAsset,
  goalQuotes?: string[],
  visionBoardAssets?: VisionBoardAssets
): Promise<CompositionResult> {
  console.log("🎨 [CANVAS] Starting A4 composition...");
  console.log(`   - Canvas: ${config.width}x${config.height}`);
  console.log(`   - Background: ${config.backgroundColor}`);
  console.log(`   - Layout slots: ${layoutSlots.length}`);
  console.log(`   - Images available: ${images.length}`);
  console.log(`   - Logo provided: ${logoBuffer ? "✅" : "❌"}`);
  console.log(`   - User name: ${config.userName || "(not set)"}`);
  
  // Validate logo buffer if provided
  if (logoBuffer) {
    logBufferMagicBytes(logoBuffer, "Logo");
  }
  
  const { width, height, backgroundColor } = config;
  const isA4Mode = width === A4_CANVAS.width && height === A4_CANVAS.height;
  const isEditorialGrid = layoutSlots.some((s) => s.type === "text");
  
  console.log(`📐 [CANVAS] A4 mode: ${isA4Mode ? "YES" : "NO"}, Editorial grid: ${isEditorialGrid ? "YES" : "NO"}`);

  // Create base canvas with outer background color
  let canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: hexToRgba(backgroundColor),
    },
  });

  const allComposites: sharp.OverlayOptions[] = [];

  // ==========================================================================
  // STEP 1: RENDER INNER BOARD RECTANGLE (A4 polaroid only, not editorial grid)
  // ==========================================================================
  
  if (isA4Mode && !isEditorialGrid) {
    const innerRect = getA4InnerBoardRect();
    console.log(`📐 [CANVAS] Inner board: ${innerRect.innerW}x${innerRect.innerH} at (${innerRect.innerX}, ${innerRect.innerY})`);
    
    // Create inner board SVG with rounded corners
    const innerBoardSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect 
          x="${innerRect.innerX}" 
          y="${innerRect.innerY}" 
          width="${innerRect.innerW}" 
          height="${innerRect.innerH}" 
          rx="28" 
          ry="28"
          fill="${A4_FRAME.innerBg}"
        />
      </svg>
    `.trim();
    
    const innerBoardBuffer = await sharp(Buffer.from(innerBoardSvg)).png().toBuffer();
    allComposites.push({
      input: innerBoardBuffer,
      top: 0,
      left: 0,
    });
    console.log("✅ [CANVAS] Added inner board rectangle");
  }

  // ==========================================================================
  // STEP 2: RENDER TITLE TEXT (A4 polaroid with userName, not editorial grid)
  // ==========================================================================
  
  if (isA4Mode && !isEditorialGrid && config.userName) {
    const titleText = `${config.userName}'s Vision Board`;
    const titleFontSize = 72;
    const titleX = A4_FRAME.outerPadX;
    const titleY = 130; // Vertically centered in top padding area
    
    // Try to load a nice font, fallback to SVG text
    let titleBuffer: Buffer;
    
    try {
      // Use only Dazzed for all text on the board
      const fontPaths = [
        join(process.cwd(), "public", "Dazzed", "Dazzed-TRIAL-Bold.ttf"),
        join(process.cwd(), "public", "Dazzed", "Dazzed-TRIAL-SemiBold.ttf"),
      ];
      
      let font: opentype.Font | null = null;
      for (const fontPath of fontPaths) {
        try {
          const fontBuffer = await readFile(fontPath);
          const arrayBuffer = fontBuffer.buffer.slice(
            fontBuffer.byteOffset,
            fontBuffer.byteOffset + fontBuffer.byteLength
          );
          font = opentype.parse(arrayBuffer);
          console.log(`✅ [CANVAS] Loaded title font (Dazzed): ${fontPath}`);
          break;
        } catch {
          continue;
        }
      }
      
      if (font) {
        // Render title using opentype.js for reliable font rendering
        const path = font.getPath(titleText, 0, 0, titleFontSize, { letterSpacing: 0 });
        let pathData = path.toSVG(2);
        if (!pathData.includes('fill=')) {
          pathData = pathData.replace('<path', '<path fill="#FFFFFF"');
        } else {
          pathData = pathData.replace(/fill="[^"]*"/g, 'fill="#FFFFFF"');
        }
        
        const titleSvg = `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(${titleX}, ${titleY})">
              ${pathData}
            </g>
          </svg>
        `.trim();
        
        titleBuffer = await sharp(Buffer.from(titleSvg)).png().toBuffer();
      } else {
        throw new Error("No font available");
      }
    } catch {
      // Fallback to SVG text
      console.log("⚠️  [CANVAS] Using fallback SVG text for title");
      const titleSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text 
            x="${titleX}" 
            y="${titleY}" 
font-family="Dazzed, sans-serif"
            font-size="${titleFontSize}"
            font-weight="700" 
            fill="#FFFFFF">
            ${escapeXmlForSvg(titleText)}
          </text>
        </svg>
      `.trim();
      
      titleBuffer = await sharp(Buffer.from(titleSvg)).png().toBuffer();
    }
    
    allComposites.push({
      input: titleBuffer,
      top: 0,
      left: 0,
    });
    console.log(`✅ [CANVAS] Added title: "${titleText}"`);
  }

  // ==========================================================================
  // STEP 3: RENDER EDITORIAL GRID (current Lambda path) — polaroid path is skipped
  // ==========================================================================
  
  if (isEditorialGrid) {
    const editorialComposites = await prepareEditorialGridComposites(
      layoutSlots,
      images,
      textBlocks,
      width,
      height
    );
    allComposites.push(...editorialComposites);
    console.log(`✅ [CANVAS] Added ${editorialComposites.length} editorial grid composites`);
  } else {
    const polaroidSlots = layoutSlots.filter(
      (slot) => slot.type === "polaroid" || (slot.type === "image" && slot.goalIndex !== undefined && slot.kind !== "background")
    );
    console.log(`📸 [CANVAS] Rendering ${polaroidSlots.length} polaroid cards...`);
    
    if (visionBoardAssets && visionBoardAssets.cards.length > 0) {
      const polaroidComposites = await preparePolaroidCardComposites(
        polaroidSlots,
        visionBoardAssets.cards,
        width,
        height,
        isA4Mode
      );
      allComposites.push(...polaroidComposites);
      console.log(`✅ [CANVAS] Added ${polaroidComposites.length} polaroid composites`);
    } else if (goalQuotes && goalQuotes.length > 0) {
      const polaroidComposites = await preparePolaroidComposites(
        polaroidSlots,
        images,
        goalQuotes,
        width,
        height,
        isA4Mode
      );
      allComposites.push(...polaroidComposites);
      console.log(`✅ [CANVAS] Added ${polaroidComposites.length} polaroid composites (legacy mode)`);
    }
  }

  // ==========================================================================
  // STEP 4: RENDER LOGO (A4 mode: bottom-right)
  // ==========================================================================
  
  if (logoBuffer) {
    try {
      // Validate logo is a raster format
      if (!isValidRasterBuffer(logoBuffer)) {
        console.warn("⚠️  [CANVAS] Logo buffer is not PNG/JPEG, attempting to process anyway...");
        logBufferMagicBytes(logoBuffer, "Invalid logo");
      }
      
      const logoSize = Math.round(width * 0.10); // 10% of canvas width
      
      const logoInput = await sharp(logoBuffer)
        .resize(logoSize, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      
      // Get actual logo dimensions after resize
      const logoMeta = await sharp(logoInput).metadata();
      const logoW = logoMeta.width || logoSize;
      const logoH = logoMeta.height || logoSize;
      
      if (isEditorialGrid || !isA4Mode) {
        // Editorial grid and non-A4: logo top-left
        allComposites.push({
          input: logoInput,
          top: Math.round(width * 0.02),
          left: Math.round(width * 0.02),
        });
        console.log("✅ [CANVAS] Added logo at top-left");
      } else {
        // A4 polaroid: bottom-right
        const logoX = width - A4_FRAME.outerPadX - logoW;
        const logoY = height - 80 - logoH;
        allComposites.push({
          input: logoInput,
          top: logoY,
          left: logoX,
        });
        console.log(`✅ [CANVAS] Added logo at bottom-right (${logoX}, ${logoY})`);
      }
    } catch (error) {
      console.error("❌ [CANVAS] Failed to process logo:", error);
      logBufferMagicBytes(logoBuffer, "Failed logo");
      // Continue without logo rather than crashing
    }
  }

  // ==========================================================================
  // STEP 5: COMPOSE FINAL IMAGE
  // ==========================================================================
  
  console.log(`🔧 [CANVAS] Compositing ${allComposites.length} layers...`);
  
  const finalBuffer = await canvas
    .composite(allComposites)
    .jpeg({
      quality: 92,
      mozjpeg: true,
    })
    .toBuffer();

  console.log(`✅ [CANVAS] Composition complete: ${(finalBuffer.length / 1024).toFixed(0)}KB`);

  return {
    imageBuffer: finalBuffer,
    width,
    height,
  };
}

// =============================================================================
// EDITORIAL GRID RENDERING (masonry images + text with solid colored backgrounds)
// =============================================================================

/** Solid background colors for text boxes (no glassmorphism) */
const TEXT_BG_PALETTE = ["#F5E6D3", "#E8D5E0", "#D4E5E0", "#F0E6D3"]; // beige, lavender, sage, cream

/** Max concurrent image fetches+resizes to avoid memory spikes on Lambda */
const EDITORIAL_IMAGE_BATCH_SIZE = 8;

/**
 * Prepare composites for editorial_grid: masonry image slots + text slots with solid colored backgrounds.
 * Uses parallel batches for images and parallel text rendering for speed.
 */
async function prepareEditorialGridComposites(
  layoutSlots: LayoutSlot[],
  images: ImageAsset[],
  textBlocks: TextBlock[],
  _canvasWidth: number,
  _canvasHeight: number
): Promise<sharp.OverlayOptions[]> {
  const imageSlots = layoutSlots.filter((s) => s.type === "image").sort((a, b) => a.y - b.y || a.x - b.x);
  const textSlots = layoutSlots.filter((s) => s.type === "text");

  // 1. Image slots: process in parallel batches (natural colors; center crop is faster than entropy)
  const imageComposites: sharp.OverlayOptions[] = [];
  for (let b = 0; b < imageSlots.length; b += EDITORIAL_IMAGE_BATCH_SIZE) {
    const batch = imageSlots.slice(b, b + EDITORIAL_IMAGE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (slot, bi) => {
        const i = b + bi;
        const image = images[i];
        if (!image || !slot.width || !slot.height) return null;
        try {
          const url = image.downloadUrl || image.url;
          const res = await fetch(url);
          if (!res.ok) return null;
          const buf = Buffer.from(await res.arrayBuffer());
          const resized = await sharp(buf)
            .resize(Math.round(slot.width), Math.round(slot.height), { fit: "cover", position: "center" })
            .jpeg({ quality: 85 })
            .toBuffer();
          return { input: resized, left: Math.round(slot.x), top: Math.round(slot.y) } as sharp.OverlayOptions;
        } catch {
          return null;
        }
      })
    );
    imageComposites.push(...results.filter((r): r is sharp.OverlayOptions => r !== null));
  }

  // 2. Text slots: render all in parallel (solid colored backgrounds)
  const textComposites = await Promise.all(
    textSlots.map(async (slot, i) => {
      const text = textBlocks[i]?.text?.trim() || "";
      if (!text || !slot.width) return null;
      const slotW = Math.round(slot.width);
      const slotH = Math.max(Math.round(slot.height || 72), 48);
      const bgColor = TEXT_BG_PALETTE[i % TEXT_BG_PALETTE.length];
      const fontSize = Math.min(28, Math.max(14, Math.floor(slotH * 0.35)));
      const textSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${slotW}" height="${slotH}" viewBox="0 0 ${slotW} ${slotH}">
        <rect x="0" y="0" width="${slotW}" height="${slotH}" rx="8" fill="${bgColor}"/>
        <text x="${slotW / 2}" y="${slotH / 2}" font-family="Dazzed, sans-serif" font-size="${fontSize}" fill="#1a1a1a" text-anchor="middle" dominant-baseline="middle">${escapeXmlForSvg(text)}</text>
      </svg>
    `.trim();
      const textBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer();
      return { input: textBuffer, left: Math.round(slot.x), top: Math.round(slot.y) } as sharp.OverlayOptions;
    })
  );

  return [...imageComposites, ...textComposites.filter((r): r is sharp.OverlayOptions => r !== null)];
}

// =============================================================================
// POLAROID RENDERING
// =============================================================================

/**
 * Build a polaroid card with SQUARE photo and caption
 * 
 * Polaroid geometry:
 * - Frame padding: ~6% of card width
 * - Photo: SQUARE (photoSize x photoSize)
 * - Caption area: ~20% of card height
 * - Rounded corners: 10px
 */
async function buildPolaroidCard(params: {
  imageBuffer: Buffer;
  caption: string;
  cardW: number;
  cardH: number;
  rotation?: number;
}): Promise<Buffer> {
  const { imageBuffer, caption, cardW, cardH, rotation = 0 } = params;
  
  // Polaroid geometry for SQUARE photo
  const radius = 10;
  const innerPad = Math.round(cardW * 0.06);
  const photoSize = cardW - (innerPad * 2); // SQUARE photo
  const photoTop = innerPad;
  const captionHeight = Math.round(cardH * 0.20);
  const captionTop = photoTop + photoSize + Math.round(innerPad * 0.6);
  
  console.log(`📷 [POLAROID] Card: ${cardW}x${cardH}, Photo: ${photoSize}x${photoSize}, Caption area: ${captionHeight}px`);
  
  // Resize photo to EXACT SQUARE (cover fit)
  const photoBuffer = await sharp(imageBuffer)
    .resize(photoSize, photoSize, {
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  const photoDataUri = `data:image/jpeg;base64,${photoBuffer.toString("base64")}`;
  
  // Caption text sizing
  const maxCaptionFontSize = 48;
  const minCaptionFontSize = 28;
  const captionPadding = innerPad;
  const maxCaptionWidth = photoSize;
  
  // Simple font size calculation based on caption length
  let fontSize = maxCaptionFontSize;
  if (caption.length > 30) {
    fontSize = minCaptionFontSize;
  } else if (caption.length > 20) {
    fontSize = 36;
  } else if (caption.length > 12) {
    fontSize = 42;
  }
  
  // Caption Y position (vertically centered in caption area)
  const captionY = captionTop + (captionHeight / 2) + (fontSize / 3);
  const captionX = cardW / 2; // Center horizontally
  
  // Build SVG for polaroid card
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}" viewBox="0 0 ${cardW} ${cardH}">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.15"/>
        </filter>
        <clipPath id="photoClip">
          <rect x="${innerPad}" y="${photoTop}" width="${photoSize}" height="${photoSize}" rx="6"/>
        </clipPath>
      </defs>
      
      <!-- Card background with shadow -->
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="${radius}" fill="#FFFFFF" filter="url(#shadow)"/>
      
      <!-- Photo (natural colors, no filters) -->
      <g clip-path="url(#photoClip)">
        <image href="${photoDataUri}" x="${innerPad}" y="${photoTop}" width="${photoSize}" height="${photoSize}" preserveAspectRatio="xMidYMid slice"/>
      </g>
      
      <!-- Caption on white card (no sepia/overlay; card background is already white) -->
      <text 
        x="${captionX}" 
        y="${captionY}"
        font-family="Dazzed, sans-serif"
        font-size="${fontSize}"
        font-weight="500"
        fill="#111111"
        text-anchor="middle"
        dominant-baseline="middle">
        ${escapeXmlForSvg(caption)}
      </text>
    </svg>
  `.trim();
  
  // Convert SVG to PNG
  let polaroidBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  
  // Apply rotation if specified
  if (rotation !== 0) {
    polaroidBuffer = await sharp(polaroidBuffer)
      .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  
  return polaroidBuffer;
}

/** Max concurrent polaroid cards (fetch + build) to balance speed vs Lambda memory */
const POLAROID_BATCH_SIZE = 4;

/**
 * Prepare polaroid card composites with stable goal-to-image-to-quote mapping.
 * Processes cards in parallel batches for faster Lambda execution.
 */
async function preparePolaroidCardComposites(
  polaroidSlots: LayoutSlot[],
  cards: GoalCard[],
  canvasWidth: number,
  canvasHeight: number,
  isA4Mode: boolean
): Promise<sharp.OverlayOptions[]> {
  const margin = isA4Mode ? 40 : 90;
  const sortedCards = [...cards].sort((a, b) => a.goalIndex - b.goalIndex);
  const sortedSlots = [...polaroidSlots].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  const composites: sharp.OverlayOptions[] = [];
  for (let b = 0; b < sortedSlots.length; b += POLAROID_BATCH_SIZE) {
    const batch = sortedSlots.slice(b, b + POLAROID_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (slot) => {
        const card = slot.goalIndex !== undefined && slot.goalIndex >= 0
          ? sortedCards.find(c => c.goalIndex === slot.goalIndex)
          : undefined;
        if (!card) return null;
        try {
          const imageResponse = await fetch(card.imageDownloadUrl || card.imageUrl);
          if (!imageResponse.ok) return null;
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const polaroidBuffer = await buildPolaroidCard({
            imageBuffer,
            caption: card.quoteText || "",
            cardW: Math.round(slot.width),
            cardH: Math.round(slot.height),
            rotation: slot.rotation || 0,
          });
          const polaroidMeta = await sharp(polaroidBuffer).metadata();
          const rotatedW = polaroidMeta.width || slot.width;
          const rotatedH = polaroidMeta.height || slot.height;
          let leftPos = clamp(Math.round(slot.x), margin, canvasWidth - rotatedW - margin);
          let topPos = clamp(Math.round(slot.y), margin, canvasHeight - rotatedH - margin);
          return { input: polaroidBuffer, left: leftPos, top: topPos } as sharp.OverlayOptions;
        } catch {
          return null;
        }
      })
    );
    composites.push(...results.filter((r): r is sharp.OverlayOptions => r !== null));
  }

  return composites;
}

/**
 * Prepare polaroid composites (legacy mode)
 */
async function preparePolaroidComposites(
  polaroidSlots: LayoutSlot[],
  images: ImageAsset[],
  goalQuotes: string[],
  canvasWidth: number,
  canvasHeight: number,
  isA4Mode: boolean
): Promise<sharp.OverlayOptions[]> {
  const composites: sharp.OverlayOptions[] = [];
  const margin = isA4Mode ? 40 : 90;

  // Sort slots by zIndex
  const sortedSlots = [...polaroidSlots].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (let i = 0; i < sortedSlots.length; i++) {
    const slot = sortedSlots[i];
    const imageIndex = slot.goalIndex ?? i;
    
    if (imageIndex >= images.length) {
      console.warn(`⚠️  [CANVAS] No image for polaroid ${i}, skipping`);
      continue;
    }

    const image = images[imageIndex] || images[images.length - 1];
    const captionText = goalQuotes[imageIndex] || "";

    try {
      const imageResponse = await fetch(image.downloadUrl || image.url);
      if (!imageResponse.ok) {
        console.warn(`❌ [CANVAS] Failed to download image ${image.id}`);
        continue;
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const polaroidBuffer = await buildPolaroidCard({
        imageBuffer,
        caption: captionText,
        cardW: Math.round(slot.width),
        cardH: Math.round(slot.height),
        rotation: slot.rotation || 0,
      });
      
      const polaroidMeta = await sharp(polaroidBuffer).metadata();
      const rotatedW = polaroidMeta.width || slot.width;
      const rotatedH = polaroidMeta.height || slot.height;

      let leftPos = Math.round(slot.x);
      let topPos = Math.round(slot.y);
      
      leftPos = clamp(leftPos, margin, canvasWidth - rotatedW - margin);
      topPos = clamp(topPos, margin, canvasHeight - rotatedH - margin);

      composites.push({
        input: polaroidBuffer,
        left: leftPos,
        top: topPos,
      });
    } catch (error) {
      console.error(`❌ [CANVAS] Error processing polaroid ${i}:`, error);
      continue;
    }
  }

  return composites;
}

// =============================================================================
// EXPORTS FOR BACKWARDS COMPATIBILITY
// =============================================================================

// CanvasConfig is already exported above, no need to re-export
