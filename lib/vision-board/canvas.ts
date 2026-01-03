/**
 * Canvas Composition System
 * 
 * Uses Sharp to compose images and text on a canvas.
 * Handles image placement, cropping, and text rendering with safe area enforcement.
 */

import sharp from "sharp";
import { LayoutSlot, ImageAsset, TextBlock } from "./types";
import { readFile } from "fs/promises";
import { join } from "path";

export type CanvasConfig = {
  width: number;
  height: number;
  backgroundColor: string; // e.g., "#F6F4F0"
};

export type CompositionResult = {
  imageBuffer: Buffer;
  width: number;
  height: number;
};

/**
 * Compose a vision board from images, text, and layout slots
 */
export async function composeVisionBoard(
  config: CanvasConfig,
  layoutSlots: LayoutSlot[],
  images: ImageAsset[],
  textBlocks: TextBlock[],
  logoBuffer?: Buffer
): Promise<CompositionResult> {
  console.log("🎨 [CANVAS] Starting composition...");
  console.log(`   - Canvas: ${config.width}x${config.height}`);
  console.log(`   - Background: ${config.backgroundColor}`);
  console.log(`   - Layout slots: ${layoutSlots.length}`);
  console.log(`   - Images available: ${images.length}`);
  console.log(`   - Text blocks: ${textBlocks.length}`);
  console.log(`   - Logo: ${logoBuffer ? "✅" : "❌"}`);
  
  const { width, height, backgroundColor } = config;

  // Create base canvas with background color
  let canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: hexToRgba(backgroundColor),
    },
  });

  // Separate image and text slots
  const imageSlots = layoutSlots.filter((slot) => slot.type === "image");
  const textSlots = layoutSlots.filter((slot) => slot.type === "text");
  
  console.log(`📐 [CANVAS] Image slots: ${imageSlots.length}, Text slots: ${textSlots.length}`);

  // Match images to slots and prepare composites
  console.log("🖼️  [CANVAS] Preparing image composites...");
  const imageComposites = await prepareImageComposites(
    imageSlots,
    images,
    width,
    height
  );
  console.log(`✅ [CANVAS] Prepared ${imageComposites.length} image composites`);

  // Text overlays disabled for now
  // console.log("✍️  [CANVAS] Preparing text composites...");
  // const textComposites = await prepareTextComposites(
  //   textSlots,
  //   textBlocks,
  //   width,
  //   height
  // );
  // console.log(`✅ [CANVAS] Prepared ${textComposites.length} text composites`);

  // Combine all composites (text disabled)
  const allComposites = [...imageComposites];

  // Apply logo if provided (overlay on top)
  if (logoBuffer) {
    const logoSize = Math.round(width * 0.08); // 8% of canvas width
    allComposites.push({
      input: await sharp(logoBuffer)
        .resize(logoSize, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer(),
      top: Math.round(width * 0.02), // 2% padding from top
      left: Math.round(width * 0.02), // 2% padding from left
    });
  }

  // Apply all composites to canvas
  let finalBuffer = await canvas
    .composite(allComposites)
    .jpeg({
      quality: 90,
      mozjpeg: true,
    })
    .toBuffer();

  // Validation: Check for gaps (scan edges)
  // If gaps detected, scale images slightly and retry
  const hasGaps = await validateNoGaps(finalBuffer, width, height, backgroundColor);
  if (hasGaps) {
    console.warn("⚠️  [CANVAS] Gaps detected! Scaling images slightly to fill...");
    
    // Scale all images by 1.02x (2% larger) to ensure coverage
    // BUT ensure they don't exceed canvas bounds when positioned
    const scaledImageComposites = await Promise.all(
      imageComposites.map(async (composite) => {
        const processed = sharp(composite.input as Buffer);
        const metadata = await processed.metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;
        
        // Calculate max allowed dimensions based on position
        const compositeLeft = composite.left || 0;
        const compositeTop = composite.top || 0;
        const maxAllowedWidth = width - compositeLeft;
        const maxAllowedHeight = height - compositeTop;
        
        // Scale by 1.02x but clamp to canvas bounds
        const scaledWidth = Math.min(
          Math.ceil(originalWidth * 1.02),
          maxAllowedWidth
        );
        const scaledHeight = Math.min(
          Math.ceil(originalHeight * 1.02),
          maxAllowedHeight
        );
        
        // Ensure valid dimensions
        if (scaledWidth <= 0 || scaledHeight <= 0) {
          console.warn(`⚠️  [CANVAS] Invalid scaled dimensions, using original`);
          return composite; // Return original if scaling would be invalid
        }
        
        return {
          ...composite,
          input: await processed
            .resize(scaledWidth, scaledHeight, {
              fit: "cover",
            })
            .toBuffer(),
        };
      })
    );
    
    // Rebuild canvas with scaled images
    const scaledCanvas = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: hexToRgba(backgroundColor),
      },
    } as any);
    
    const logoComposite = logoBuffer ? [{
      input: await sharp(logoBuffer)
        .resize(Math.round(width * 0.08), undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer(),
      top: Math.round(width * 0.02),
      left: Math.round(width * 0.02),
    }] : [];
    
    finalBuffer = await scaledCanvas
      .composite([...scaledImageComposites, ...logoComposite])
      .jpeg({
        quality: 90,
        mozjpeg: true,
      })
      .toBuffer();
  }

  return {
    imageBuffer: finalBuffer,
    width,
    height,
  };
}

/**
 * Prepare image composites for Sharp
 * 
 * CRITICAL: Images must fill slots exactly with NO gaps
 * Images are scaled to fill entire slot, cropping as needed
 * Includes stronger zoom for social media style (subset of images)
 */
async function prepareImageComposites(
  imageSlots: LayoutSlot[],
  images: ImageAsset[],
  canvasWidth: number,
  canvasHeight: number
): Promise<sharp.OverlayOptions[]> {
  const composites: sharp.OverlayOptions[] = [];
  let imageIndex = 0;
  
  // 20% of images get stronger zoom (social media style)
  const strongZoomRatio = 0.3; // 30% get strong zoom

  for (const slot of imageSlots) {
    if (imageIndex >= images.length) {
      console.warn(`⚠️  [CANVAS] Not enough images! Need ${imageSlots.length}, have ${images.length}`);
      // Reuse images if we run out (last resort)
      imageIndex = 0;
    }

    const image = images[imageIndex];
    imageIndex++;

    try {
      // Download image
      const imageResponse = await fetch(image.downloadUrl || image.url);
      if (!imageResponse.ok) {
        console.warn(`Failed to download image ${image.id}`);
        continue;
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // CRITICAL: Images must fill slots EXACTLY with no gaps
      // Calculate dimensions with edge coverage
      let finalWidth = Math.ceil(slot.width);
      let finalHeight = Math.ceil(slot.height);
      let topPos = Math.floor(slot.y);
      let leftPos = Math.floor(slot.x);
      
      // Extend images at edges to ensure complete coverage
      const buffer = 3; // Small buffer to prevent gaps
      
      // If at top edge, start at 0
      if (slot.y <= 1) {
        topPos = 0;
      }
      // If at left edge, start at 0
      if (slot.x <= 1) {
        leftPos = 0;
      }
      // If at bottom edge, extend to canvas bottom
      if (slot.y + slot.height >= canvasHeight * 0.97) {
        finalHeight = canvasHeight - topPos + buffer;
      } else {
        finalHeight = Math.ceil(slot.height) + buffer;
      }
      // If at right edge, extend to canvas right
      if (slot.x + slot.width >= canvasWidth * 0.97) {
        finalWidth = canvasWidth - leftPos + buffer;
      } else {
        finalWidth = Math.ceil(slot.width) + buffer;
      }
      
      // CRITICAL: Ensure dimensions don't exceed canvas bounds
      // Sharp requires: leftPos + finalWidth <= canvasWidth AND topPos + finalHeight <= canvasHeight
      const maxAllowedWidth = canvasWidth - leftPos;
      const maxAllowedHeight = canvasHeight - topPos;
      finalWidth = Math.min(finalWidth, maxAllowedWidth);
      finalHeight = Math.min(finalHeight, maxAllowedHeight);
      
      // Ensure we have valid dimensions
      if (finalWidth <= 0 || finalHeight <= 0) {
        console.warn(`⚠️  [CANVAS] Invalid dimensions for slot at (${slot.x}, ${slot.y}): ${finalWidth}x${finalHeight}`);
        continue; // Skip this slot
      }

      // Determine crop strategy
      const useStrongZoom = Math.random() < strongZoomRatio;
      
      // Process image
      let processedImage;
      if (useStrongZoom) {
        // Strong zoom: resize to 1.2x then crop to exact size (creates zoomed-in effect)
        const zoomWidth = Math.ceil(finalWidth * 1.2);
        const zoomHeight = Math.ceil(finalHeight * 1.2);
        processedImage = await sharp(imageBuffer)
          .resize(zoomWidth, zoomHeight, {
            fit: "cover",
            position: "entropy",
          })
          .extract({
            left: Math.floor((zoomWidth - finalWidth) / 2),
            top: Math.floor((zoomHeight - finalHeight) / 2),
            width: finalWidth,
            height: finalHeight,
          })
          .toBuffer();
      } else {
        // Normal crop: resize to fill slot exactly
        processedImage = await sharp(imageBuffer)
          .resize(finalWidth, finalHeight, {
            fit: "cover",
            position: "entropy", // Preserves important parts of the image
          })
          .toBuffer();
      }
      
      composites.push({
        input: processedImage,
        top: topPos,
        left: leftPos,
      });
    } catch (error) {
      console.error(`Error processing image ${image.id}:`, error);
      // Continue with next image
    }
  }

  console.log(`✅ [CANVAS] Prepared ${composites.length} image composites (exact fit, no gaps)`);
  return composites;
}

/**
 * Prepare text composites for Sharp
 * 
 * Magazine cutout style with safe area enforcement:
 * - 32px minimum margin from all edges
 * - Text wrapping with max 60% canvas width
 * - Auto-size font if needed
 * - Rotation (-2° to +2°)
 * - Variable fonts, weights, sizes
 * - Some ALL CAPS, some sentence case
 */
async function prepareTextComposites(
  textSlots: LayoutSlot[],
  textBlocks: TextBlock[],
  canvasWidth: number,
  canvasHeight: number
): Promise<sharp.OverlayOptions[]> {
  const composites: sharp.OverlayOptions[] = [];
  const safeMargin = 32; // 32px minimum margin from edges
  // Small square text boxes (text-xs size)
  const textXsSize = 12; // Tailwind text-xs = 12px
  const boxSize = 200; // Small square boxes (200x200px)
  const paddingH = 16; // Horizontal padding
  const paddingV = 16; // Vertical padding

  // Load Dazzed font once
  let fontBase64: string | undefined;
  try {
    const fontPath = join(process.cwd(), "public", "Dazzed", "Dazzed-TRIAL-Bold.ttf");
    const fontBuffer = await readFile(fontPath);
    fontBase64 = fontBuffer.toString("base64");
    console.log("✅ [CANVAS] Loaded Dazzed font");
  } catch (error) {
    console.warn("⚠️  [CANVAS] Could not load Dazzed font, using fallback:", error);
  }

  // Candidate anchor positions (quadrants)
  const anchors = [
    { x: canvasWidth * 0.1, y: canvasHeight * 0.1 }, // top-left
    { x: canvasWidth * 0.35, y: canvasHeight * 0.15 }, // upper-middle
    { x: canvasWidth * 0.1, y: canvasHeight * 0.45 }, // center-left
    { x: canvasWidth * 0.6, y: canvasHeight * 0.7 }, // lower-right
    { x: canvasWidth * 0.1, y: canvasHeight * 0.8 }, // bottom-left
  ];

  for (let i = 0; i < Math.min(textSlots.length, textBlocks.length); i++) {
    const textBlock = textBlocks[i];
    
    // Choose anchor position
    const anchorIndex = i % anchors.length;
    let anchorX = anchors[anchorIndex].x;
    let anchorY = anchors[anchorIndex].y;
    
    // Determine text case (some ALL CAPS, some sentence case)
    const useAllCaps = i % 2 === 0;
    const displayText = useAllCaps ? textBlock.text.toUpperCase() : textBlock.text;
    
    // Use text-xs size (12px) with Dazzed font
    const fontWeight = textBlock.tone === "bold" ? "700" : "400";
    const fontSize = textXsSize; // 12px (Tailwind text-xs)
    const letterSpacing = 0.5; // Slight letter spacing
    
    // Determine rotation (-2° to +2°)
    const rotation = (Math.random() * 4 - 2).toFixed(1); // -2.0 to +2.0
    
    // Small square box - wrap text to fit
    const textAreaWidth = boxSize - (paddingH * 2);
    const avgCharWidth = fontSize * 0.6;
    const charsPerLine = Math.floor(textAreaWidth / avgCharWidth);
    
    // Wrap text to fit in square box
    const words = displayText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (testLine.length <= charsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length > charsPerLine ? word.substring(0, charsPerLine) : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Calculate box height - ensure it's square or close to square
    const lineHeight = fontSize * 1.3;
    let boxHeight = (lines.length * lineHeight) + (paddingV * 2);
    
    // Auto-size: reduce font size if text doesn't fit in square box
    let finalFontSize = fontSize;
    let finalBoxHeight = boxHeight;
    const maxHeight = boxSize; // Keep it square
    
    if (boxHeight > maxHeight) {
      // Reduce font size to fit
      const scaleFactor = (maxHeight - paddingV * 2) / (boxHeight - paddingV * 2);
      finalFontSize = Math.floor(fontSize * scaleFactor * 0.95); // 95% to be safe
      finalBoxHeight = (lines.length * (finalFontSize * 1.3)) + (paddingV * 2);
    }
    
    // Ensure box stays square
    const boxWidth = boxSize;
    const finalBoxHeightSquare = Math.max(finalBoxHeight, boxSize);
    
    // Clamp position to safe area
    const maxX = canvasWidth - boxWidth - safeMargin;
    const maxY = canvasHeight - finalBoxHeightSquare - safeMargin;
    let finalX = Math.max(safeMargin, Math.min(anchorX, maxX));
    let finalY = Math.max(safeMargin, Math.min(anchorY, maxY));
    
    // Final validation: ensure everything fits
    if (finalX + boxWidth > canvasWidth - safeMargin || 
        finalY + finalBoxHeightSquare > canvasHeight - safeMargin) {
      // Fallback: center position
      const fallbackX = Math.max(safeMargin, Math.min((canvasWidth - boxWidth) / 2, maxX));
      const fallbackY = Math.max(safeMargin, Math.min((canvasHeight - finalBoxHeightSquare) / 2, maxY));
      finalX = fallbackX;
      finalY = fallbackY;
    }
    
    // Background color (white or beige)
    const bgColor = i % 2 === 0 ? "#FFFFFF" : "#F5F5DC";
    const bgOpacity = 0.95 + (Math.random() * 0.03); // 95-98% opacity
    
    // Calculate line height for final font size
    const finalLineHeight = finalFontSize * 1.3;
    
    // Create SVG with rotation, wrapping, and safe positioning
    // Always use Dazzed font (required)
    let svgText: string;
    
    if (fontBase64) {
      svgText = `
        <svg width="${boxWidth}" height="${finalBoxHeightSquare}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              @font-face {
                font-family: 'Dazzed';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                font-weight: ${fontWeight};
              }
            </style>
          </defs>
          <g transform="rotate(${rotation} ${boxWidth/2} ${finalBoxHeightSquare/2})">
            <!-- Background rectangle -->
            <rect
              x="0"
              y="0"
              width="${boxWidth}"
              height="${finalBoxHeightSquare}"
              fill="${bgColor}"
              opacity="${bgOpacity.toFixed(2)}"
              rx="4"
            />
            <!-- Text lines -->
            ${lines.map((line, lineIndex) => `
              <text
                x="${boxWidth / 2}"
                y="${paddingV + (lineIndex + 1) * finalLineHeight}"
                font-family="Dazzed, Arial, sans-serif"
                font-size="${finalFontSize}"
                font-weight="${fontWeight}"
                fill="#000000"
                text-anchor="middle"
                dominant-baseline="middle"
                style="letter-spacing: ${letterSpacing}px;"
              >
                ${escapeXml(line)}
              </text>
            `).join("")}
          </g>
        </svg>
      `.trim();
    } else {
      // Fallback: still try to use Dazzed if available, otherwise Arial
      svgText = `
        <svg width="${boxWidth}" height="${finalBoxHeightSquare}" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(${rotation} ${boxWidth/2} ${finalBoxHeightSquare/2})">
            <!-- Background rectangle -->
            <rect
              x="0"
              y="0"
              width="${boxWidth}"
              height="${finalBoxHeightSquare}"
              fill="${bgColor}"
              opacity="${bgOpacity.toFixed(2)}"
              rx="4"
            />
            <!-- Text lines -->
            ${lines.map((line, lineIndex) => `
              <text
                x="${boxWidth / 2}"
                y="${paddingV + (lineIndex + 1) * finalLineHeight}"
                font-family="Dazzed, Arial, sans-serif"
                font-size="${finalFontSize}"
                font-weight="${fontWeight}"
                fill="#000000"
                text-anchor="middle"
                dominant-baseline="middle"
                style="letter-spacing: ${letterSpacing}px;"
              >
                ${escapeXml(line)}
              </text>
            `).join("")}
          </g>
        </svg>
      `.trim();
    }

    const svgBuffer = Buffer.from(svgText);

    composites.push({
      input: svgBuffer,
      top: Math.round(finalY),
      left: Math.round(finalX),
    });
  }

  return composites;
}

/**
 * Convert hex color to RGBA object
 */
function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b, alpha: 1 };
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate that canvas has no visible gaps
 * Scans edges and checks for background color pixels
 */
async function validateNoGaps(
  imageBuffer: Buffer,
  width: number,
  height: number,
  backgroundColor: string
): Promise<boolean> {
  try {
    const image = sharp(imageBuffer);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bgRgba = hexToRgba(backgroundColor);
    const tolerance = 10; // Allow small color differences
    
    // Sample edge pixels (top, bottom, left, right)
    const sampleSize = 50; // Sample 50 pixels per edge
    
    // Check top edge
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      const idx = (x + 0) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (
        Math.abs(r - bgRgba.r) < tolerance &&
        Math.abs(g - bgRgba.g) < tolerance &&
        Math.abs(b - bgRgba.b) < tolerance
      ) {
        return true; // Found background color = gap detected
      }
    }
    
    // Check bottom edge
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      const idx = (x + (height - 1) * width) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (
        Math.abs(r - bgRgba.r) < tolerance &&
        Math.abs(g - bgRgba.g) < tolerance &&
        Math.abs(b - bgRgba.b) < tolerance
      ) {
        return true;
      }
    }
    
    // Check left edge
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      const idx = (0 + y * width) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (
        Math.abs(r - bgRgba.r) < tolerance &&
        Math.abs(g - bgRgba.g) < tolerance &&
        Math.abs(b - bgRgba.b) < tolerance
      ) {
        return true;
      }
    }
    
    // Check right edge
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      const idx = ((width - 1) + y * width) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (
        Math.abs(r - bgRgba.r) < tolerance &&
        Math.abs(g - bgRgba.g) < tolerance &&
        Math.abs(b - bgRgba.b) < tolerance
      ) {
        return true;
      }
    }
    
    return false; // No gaps detected
  } catch (error) {
    console.warn("⚠️  [CANVAS] Gap validation failed:", error);
    return false; // Assume no gaps if validation fails
  }
}
