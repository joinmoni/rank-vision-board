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
import * as opentype from "opentype.js";

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
 * Convert text to sentence case
 * Lowercases text, uppercases first character, preserves "I" capitalization
 */
function sentenceCase(text: string): string {
  const lower = text.toLowerCase();
  // Uppercase first character
  let result = lower.charAt(0).toUpperCase() + lower.slice(1);
  // Preserve "I" capitalization (standalone I)
  result = result.replace(/\bi\b/g, "I");
  return result;
}

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

  // Prepare text composites with safe area enforcement
  console.log("✍️  [CANVAS] Preparing text composites...");
  const textComposites = await prepareTextComposites(
    textSlots,
    textBlocks,
    width,
    height
  );
  console.log(`✅ [CANVAS] Prepared ${textComposites.length} text composites`);

  // Combine all composites - TEXT LAST so it appears on top
  const allComposites = [...imageComposites, ...textComposites];

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

  // Strict post-compose coverage validation with mask
  const gapResult = await validateNoGaps(finalBuffer, width, height, backgroundColor, imageComposites);
  if (gapResult.hasGaps) {
    console.warn(`⚠️  [CANVAS] Gaps detected! ${gapResult.uncoveredPixels} uncovered pixels. Scaling images globally...`);
    
    // Global scale factor (1.03 = 3% larger)
    const globalScale = 1.03;
    
    // Scale all images by global scale factor
    const scaledImageComposites = await Promise.all(
      imageComposites.map(async (composite) => {
        const processed = sharp(composite.input as Buffer);
        const metadata = await processed.metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;
        
        // Calculate new dimensions with global scale
        const scaledWidth = Math.ceil(originalWidth * globalScale);
        const scaledHeight = Math.ceil(originalHeight * globalScale);
        
        // Calculate max allowed dimensions based on position
        const compositeLeft = composite.left || 0;
        const compositeTop = composite.top || 0;
        const maxAllowedWidth = width - compositeLeft;
        const maxAllowedHeight = height - compositeTop;
        
        // Clamp to canvas bounds
        const finalScaledWidth = Math.min(scaledWidth, maxAllowedWidth);
        const finalScaledHeight = Math.min(scaledHeight, maxAllowedHeight);
        
        // Ensure valid dimensions
        if (finalScaledWidth <= 0 || finalScaledHeight <= 0) {
          console.warn(`⚠️  [CANVAS] Invalid scaled dimensions, using original`);
          return composite; // Return original if scaling would be invalid
        }
        
        return {
          ...composite,
          input: await processed
            .resize(finalScaledWidth, finalScaledHeight, {
              fit: "cover", // Always use cover to fill completely
              position: "entropy",
              withoutEnlargement: false, // Allow enlargement
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
      .composite([...scaledImageComposites, ...textComposites, ...logoComposite])
      .jpeg({
        quality: 90,
        mozjpeg: true,
      })
      .toBuffer();
    
    // Re-validate after scaling
    const recheckGaps = await validateNoGaps(finalBuffer, width, height, backgroundColor, scaledImageComposites);
    if (recheckGaps.hasGaps) {
      console.warn(`⚠️  [CANVAS] Still has ${recheckGaps.uncoveredPixels} uncovered pixels after scaling.`);
      // Could add patch tiles here if needed
    }
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
 * - Integer-snap all positions: x=floor(x), y=floor(y), w=ceil(w), h=ceil(h)
 * - Use fit:"cover", position:"entropy", withoutEnlargement:false
 * - Allow 1-3px overlaps to prevent hairline seams
 */
async function prepareImageComposites(
  imageSlots: LayoutSlot[],
  images: ImageAsset[],
  canvasWidth: number,
  canvasHeight: number
): Promise<sharp.OverlayOptions[]> {
  const composites: sharp.OverlayOptions[] = [];
  let imageIndex = 0;
  
  // 30% of images get stronger zoom (social media style)
  const strongZoomRatio = 0.3;

  for (const slot of imageSlots) {
    if (imageIndex >= images.length) {
      console.warn(`⚠️  [CANVAS] Not enough images! Reusing images.`);
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

      // CRITICAL: Integer-snap all positions and dimensions
      let finalWidth = Math.ceil(slot.width);
      let finalHeight = Math.ceil(slot.height);
      let topPos = Math.floor(slot.y);
      let leftPos = Math.floor(slot.x);
      
      // Add tiny overlap (1-3px) between adjacent tiles to avoid hairline seams
      const overlap = 1 + Math.floor(Math.random() * 3); // 1 to 3px
      
      // Apply overlap to dimensions
      finalWidth = Math.ceil(finalWidth) + overlap;
      finalHeight = Math.ceil(finalHeight) + overlap;
      
      // Ensure doesn't exceed canvas bounds
      const maxAllowedWidth = canvasWidth - leftPos;
      const maxAllowedHeight = canvasHeight - topPos;
      finalWidth = Math.min(finalWidth, maxAllowedWidth);
      finalHeight = Math.min(finalHeight, maxAllowedHeight);
      
      // Final integer-snap
      finalWidth = Math.ceil(finalWidth);
      finalHeight = Math.ceil(finalHeight);
      topPos = Math.floor(topPos);
      leftPos = Math.floor(leftPos);
      
      // Ensure valid dimensions
      if (finalWidth <= 0 || finalHeight <= 0) {
        console.warn(`⚠️  [CANVAS] Invalid dimensions for slot at (${slot.x}, ${slot.y})`);
        continue;
      }

      // Determine crop strategy
      const useStrongZoom = Math.random() < strongZoomRatio;
      
      // Process image - ALWAYS use cover, entropy, allow enlargement
      let processedImage;
      if (useStrongZoom) {
        // Strong zoom: resize to 1.2x then crop to exact size
        const zoomWidth = Math.ceil(finalWidth * 1.2);
        const zoomHeight = Math.ceil(finalHeight * 1.2);
        processedImage = await sharp(imageBuffer)
          .resize(zoomWidth, zoomHeight, {
            fit: "cover",
            position: "entropy",
            withoutEnlargement: false,
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
            position: "entropy",
            withoutEnlargement: false, // Allow enlargement
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
      continue;
    }
  }

  console.log(`✅ [CANVAS] Prepared ${composites.length} image composites`);
  return composites;
}

/**
 * Prepare text composites for Sharp
 * 
 * Typography rules:
 * - LEFT-ALIGNED (text-anchor="start")
 * - Sentence case (uppercase first char, preserve "I")
 * - SHORT text (<=22 chars AND <=4 words): one line, hugged box, 5px padding
 * - LONG text (>22 chars OR >4 words): narrow width 260-420px, wrap by pixel, grow height
 * - Never clip (padded SVG rotation fix)
 * - Dazzed font via opentype.js paths
 */
async function prepareTextComposites(
  textSlots: LayoutSlot[],
  textBlocks: TextBlock[],
  canvasWidth: number,
  canvasHeight: number
): Promise<sharp.OverlayOptions[]> {
  const composites: sharp.OverlayOptions[] = [];
  const safeMargin = 32; // 32px minimum margin from edges
  const minFontSize = 30; // Hard minimum font size
  const baseFontSize = 44; // Base font size
  const paddingExact = 8; // Minimum 8px padding on all sides (top, bottom, left, right)
  const rotationPadding = 0.2; // 20% padding for rotation

  // Load Dazzed font using opentype.js
  let font: any = null;
  let fontBase64: string | undefined;
  
  try {
    const fontPaths = [
      join(process.cwd(), "public", "Dazzed", "Dazzed-TRIAL-Bold.ttf"),
      join(process.cwd(), "public", "Dazzed", "Dazzed-TRIAL-Regular.ttf"),
    ];
    
    for (const fontPath of fontPaths) {
      try {
        const fontBuffer = await readFile(fontPath);
        font = opentype.parse(fontBuffer.buffer);
        fontBase64 = fontBuffer.toString("base64");
        console.log(`✅ [CANVAS] Loaded Dazzed font`);
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!font) {
      console.warn("⚠️  [CANVAS] Could not load Dazzed font, will use fallback");
    }
  } catch (error) {
    console.warn("⚠️  [CANVAS] Error loading font:", error);
  }

  // Generate 2-4 text blocks
  const textCount = Math.min(textBlocks.length, 4);
  
  for (let i = 0; i < textCount; i++) {
    const textBlock = textBlocks[i];
    
    // Apply sentence case to text
    const displayText = sentenceCase(textBlock.text);
    
    // Determine if text is SHORT (<=22 chars AND <=4 words)
    const wordCount = displayText.split(" ").length;
    const charCount = displayText.length;
    const isShort = charCount <= 22 && wordCount <= 4;
    
    // Font weight
    const fontWeight = textBlock.tone === "bold" ? 700 : 400;
    const fontWeightStr = fontWeight.toString();
    
    // Rotation
    const rotation = (Math.random() * 4 - 2); // -2° to +2°
    const letterSpacing = Math.random() * 1; // 0-1px
    
    // Measure text using opentype.js
    const measureText = (text: string, size: number): number => {
      if (!font) {
        return text.length * size * 0.55;
      }
      const scale = size / font.unitsPerEm;
      let width = 0;
      for (let j = 0; j < text.length; j++) {
        const glyph = font.charToGlyph(text[j]);
        if (glyph && glyph.advanceWidth !== undefined) {
          width += glyph.advanceWidth * scale;
        }
        if (j < text.length - 1) {
          width += letterSpacing * scale;
        }
      }
      return width;
    };
    
    let lines: string[] = [];
    let finalFontSize = baseFontSize;
    let finalCardWidth: number;
    let finalCardHeight: number;
    
    if (isShort) {
      // SHORT TEXT: One line, hugged box, 5px padding
      lines = [displayText];
      finalFontSize = baseFontSize; // Start with 44px
      
      // Measure text width
      let textWidth = measureText(displayText, finalFontSize);
      
      // Card width hugs text: textWidth + 2*padding
      finalCardWidth = Math.ceil(textWidth) + (paddingExact * 2);
      
      // Enforce minimum size
      const minW = 160;
      const minH = 56;
      finalCardWidth = Math.max(finalCardWidth, minW);
      
      // Card height: use font metrics for accurate height calculation
      let fontAscentShort = finalFontSize * 0.8; // Fallback estimate
      let fontDescentShort = finalFontSize * 0.2; // Fallback estimate
      if (font) {
        const scale = finalFontSize / font.unitsPerEm;
        fontAscentShort = (font.ascender || font.tables.os2?.sTypoAscender || 800) * scale;
        fontDescentShort = Math.abs((font.descender || font.tables.os2?.sTypoDescender || -200) * scale);
      }
      const textHeight = fontAscentShort + fontDescentShort;
      finalCardHeight = Math.ceil(textHeight) + (paddingExact * 2);
      finalCardHeight = Math.max(finalCardHeight, minH);
    } else {
      // LONG TEXT: Narrow width (260-420px), wrap by pixel, grow height
      finalCardWidth = 260 + Math.floor(Math.random() * 160); // 260-420px
      finalFontSize = baseFontSize;
      
      // Wrap text by pixel width using opentype.js
      const textAreaWidth = finalCardWidth - (paddingExact * 2);
      const words = displayText.split(" ");
      let currentLine = "";
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const testWidth = measureText(testLine, finalFontSize);
        
        if (testWidth <= textAreaWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
          // Truncate if word is too long
          if (measureText(word, finalFontSize) > textAreaWidth) {
            let truncated = word;
            while (truncated.length > 0 && measureText(truncated, finalFontSize) > textAreaWidth) {
              truncated = truncated.slice(0, -1);
            }
            currentLine = truncated || word[0];
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Calculate height based on lines using font metrics
      const lineHeight = finalFontSize * 1.15;
      
      // Calculate actual text height using font metrics
      let fontAscent = finalFontSize * 0.8; // Fallback estimate
      let fontDescent = finalFontSize * 0.2; // Fallback estimate
      if (font) {
        const scale = finalFontSize / font.unitsPerEm;
        fontAscent = (font.ascender || font.tables.os2?.sTypoAscender || 800) * scale;
        fontDescent = Math.abs((font.descender || font.tables.os2?.sTypoDescender || -200) * scale);
      }
      
      // Total text height = first line ascent + (lines-1) * lineHeight + last line descent
      // For multi-line, we use: ascent + (numLines-1) * lineHeight + descent
      const textContentHeight = lines.length === 1 
        ? fontAscent + fontDescent
        : fontAscent + (lines.length - 1) * lineHeight + fontDescent;
      
      let calculatedHeight = Math.ceil(textContentHeight) + (paddingExact * 2);
      const maxH = 320;
      
      // Auto-size down if too tall
      if (calculatedHeight > maxH) {
        const scaleFactor = (maxH - paddingExact * 2) / (calculatedHeight - paddingExact * 2);
        finalFontSize = Math.max(minFontSize, Math.floor(finalFontSize * scaleFactor * 0.95));
        
        // Recalculate font metrics with new size
        if (font) {
          const scale = finalFontSize / font.unitsPerEm;
          fontAscent = (font.ascender || font.tables.os2?.sTypoAscender || 800) * scale;
          fontDescent = Math.abs((font.descender || font.tables.os2?.sTypoDescender || -200) * scale);
        } else {
          fontAscent = finalFontSize * 0.8;
          fontDescent = finalFontSize * 0.2;
        }
        
        // Re-wrap with new font size
        lines = [];
        currentLine = "";
        const newTextAreaWidth = finalCardWidth - (paddingExact * 2);
        const newLineHeight = finalFontSize * 1.15;
        
        for (const word of words) {
          const testLine = currentLine ? currentLine + " " + word : word;
          const testWidth = measureText(testLine, finalFontSize);
          
          if (testWidth <= newTextAreaWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
            }
            currentLine = word;
            if (measureText(word, finalFontSize) > newTextAreaWidth) {
              let truncated = word;
              while (truncated.length > 0 && measureText(truncated, finalFontSize) > newTextAreaWidth) {
                truncated = truncated.slice(0, -1);
              }
              currentLine = truncated || word[0];
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // Recalculate height with new metrics
        const newTextContentHeight = lines.length === 1
          ? fontAscent + fontDescent
          : fontAscent + (lines.length - 1) * newLineHeight + fontDescent;
        calculatedHeight = Math.ceil(newTextContentHeight) + (paddingExact * 2);
      }
      
      finalCardHeight = calculatedHeight;
    }
    
    // Add rotation padding (20% of max dimension)
    const rotationPad = Math.ceil(Math.max(finalCardWidth, finalCardHeight) * rotationPadding);
    const paddedWidth = finalCardWidth + (rotationPad * 2);
    const paddedHeight = finalCardHeight + (rotationPad * 2);
    
    // Position: use text slot position if available, otherwise random safe position
    let finalX = textSlots[i]?.x !== undefined 
      ? Math.floor(textSlots[i].x) 
      : safeMargin + Math.random() * (canvasWidth - finalCardWidth - safeMargin * 2);
    let finalY = textSlots[i]?.y !== undefined 
      ? Math.floor(textSlots[i].y) 
      : safeMargin + Math.random() * (canvasHeight - finalCardHeight - safeMargin * 2);
    
    // Clamp to safe area (for inner card)
    const maxX = canvasWidth - finalCardWidth - safeMargin;
    const maxY = canvasHeight - finalCardHeight - safeMargin;
    finalX = Math.max(safeMargin, Math.min(finalX, maxX));
    finalY = Math.max(safeMargin, Math.min(finalY, maxY));
    
    // Background: Soft girl palette (randomized per card)
    const softGirlColors = [
      "#F7D6DD", // blush pink
      "#FFF4EA", // warm cream
      "#E9D7F5", // soft lilac
      "#D7E8F7", // powder blue
      "#DDEBDF", // sage green
    ];
    const bgColor = softGirlColors[Math.floor(Math.random() * softGirlColors.length)];
    const bgOpacity = 0.92 + (Math.random() * 0.05); // 92-97%
    const borderRadius = 10 + Math.random() * 4; // 10-14px
    
    const lineHeight = finalFontSize * 1.15;
    
    // Calculate font metrics for text positioning (after finalCardHeight is set)
    // These metrics are used to position text baseline correctly
    let fontAscent = finalFontSize * 0.8; // Fallback estimate (80% of fontSize)
    let fontDescent = finalFontSize * 0.2; // Fallback estimate
    if (font) {
      const scale = finalFontSize / font.unitsPerEm;
      fontAscent = (font.ascender || font.tables.os2?.sTypoAscender || 800) * scale;
      fontDescent = Math.abs((font.descender || font.tables.os2?.sTypoDescender || -200) * scale);
    }
    
    // Text color: #111 or #222
    const textColor = Math.random() > 0.5 ? "#111" : "#222";
    
    // Define single content origin for consistent rect and text positioning
    const contentX = rotationPad;
    const contentY = rotationPad;
    
    // Rect starts at content origin (fully wraps text including ascent/descent)
    const rectX = contentX;
    const rectY = contentY;
    
    // Text X position: rect left + padding (guarantees visible left padding)
    const textX = contentX + paddingExact;
    
    // Text Y position: rect top + padding + fontAscent
    // This positions the baseline such that ascenders start at paddingTop
    // opentype.js paths use baseline at y=0 (in font units), so we offset by ascent
    // to align the top of ascenders with paddingTop
    const textY = contentY + paddingExact + fontAscent;
    
    // Create SVG with padded viewport and left-aligned text
    let svgText: string;
    
    if (font && fontBase64) {
      // Use opentype.js paths for reliable rendering
      const pathElements: string[] = [];
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const path = font.getPath(line, 0, 0, finalFontSize, {
          letterSpacing: letterSpacing * (finalFontSize / font.unitsPerEm),
        });
        let pathData = path.toSVG(2);
        // Add fill color to path if not present
        if (!pathData.includes('fill=')) {
          pathData = pathData.replace(/<path/, `<path fill="${textColor}"`);
        } else {
          pathData = pathData.replace(/fill="[^"]*"/g, `fill="${textColor}"`);
        }
        
        // opentype.js paths are generated with baseline at y=0 (in font units)
        // We've already positioned textY at: paddingTop + fontAscent (so baseline is correct)
        // For multi-line, each line's baseline is offset by lineIndex * lineHeight
        // Path coordinates are in font units, but getPath() scales them to fontSize
        // The path's y=0 corresponds to the baseline, so we translate to baseline position
        const lineBaselineY = textY + (lineIndex * lineHeight);
        pathElements.push(
          `<g transform="translate(${textX}, ${lineBaselineY})">${pathData}</g>`
        );
      }
      
      svgText = `
        <svg width="${paddedWidth}" height="${paddedHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${paddedWidth} ${paddedHeight}">
          <defs>
            <style>
              @font-face {
                font-family: 'Dazzed';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                font-weight: ${fontWeightStr};
              }
            </style>
          </defs>
          <g transform="rotate(${rotation} ${paddedWidth/2} ${paddedHeight/2})">
            <rect
              x="${rectX}"
              y="${rectY}"
              width="${finalCardWidth}"
              height="${finalCardHeight}"
              fill="${bgColor}"
              opacity="${bgOpacity.toFixed(2)}"
              rx="${borderRadius.toFixed(1)}"
            />
            ${pathElements.join("\n            ")}
          </g>
        </svg>
      `.trim();
    } else {
      // Fallback: SVG text with left alignment
      svgText = `
        <svg width="${paddedWidth}" height="${paddedHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${paddedWidth} ${paddedHeight}">
          <defs>
            <style>
              @font-face {
                font-family: 'Dazzed';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64 || ""}) format('truetype');
                font-weight: ${fontWeightStr};
              }
            </style>
          </defs>
          <g transform="rotate(${rotation} ${paddedWidth/2} ${paddedHeight/2})">
            <rect
              x="${rectX}"
              y="${rectY}"
              width="${finalCardWidth}"
              height="${finalCardHeight}"
              fill="${bgColor}"
              opacity="${bgOpacity.toFixed(2)}"
              rx="${borderRadius.toFixed(1)}"
            />
            ${lines.map((line, lineIndex) => {
              // For SVG <text> with dominant-baseline="hanging", y is the top of the text
              // We need to position it at: paddingTop (where ascenders should start)
              // Since textY already includes fontAscent offset for paths (baseline position),
              // for SVG text we subtract fontAscent to get the hanging baseline position
              const lineBaselineY = textY + (lineIndex * lineHeight);
              const lineHangingY = lineBaselineY - fontAscent;
              return `
              <text
                x="${textX}"
                y="${lineHangingY}"
                font-family="Dazzed, Arial, sans-serif"
                font-size="${finalFontSize}"
                font-weight="${fontWeightStr}"
                fill="${textColor}"
                text-anchor="start"
                dominant-baseline="hanging"
                style="letter-spacing: ${letterSpacing.toFixed(1)}px;"
              >
                ${escapeXml(line)}
              </text>
            `;
            }).join("")}
          </g>
        </svg>
      `.trim();
    }

    const svgBuffer = Buffer.from(svgText);
    
    // Composite with offset to account for rotation padding
    composites.push({
      input: svgBuffer,
      top: Math.round(finalY - rotationPad),
      left: Math.round(finalX - rotationPad),
    });
  }

  return composites;
}

/**
 * Convert hex color to RGBA object
 */
function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  hex = hex.replace("#", "");
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
 * Validate that canvas has no visible gaps using mask-based detection
 * Creates a mask of all placed tiles and detects uncovered pixels
 */
async function validateNoGaps(
  imageBuffer: Buffer,
  width: number,
  height: number,
  backgroundColor: string,
  imageComposites: sharp.OverlayOptions[]
): Promise<{ hasGaps: boolean; uncoveredPixels: number }> {
  try {
    const image = sharp(imageBuffer);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bgRgba = hexToRgba(backgroundColor);
    const tolerance = 15; // Allow small color differences
    
    // Create a mask of all placed tiles
    const mask = new Set<string>();
    
    // Mark all pixels covered by image composites
    for (const composite of imageComposites) {
      const left = composite.left || 0;
      const top = composite.top || 0;
      const processed = sharp(composite.input as Buffer);
      const metadata = await processed.metadata();
      const tileWidth = metadata.width || 0;
      const tileHeight = metadata.height || 0;
      
      // Mark all pixels in this tile as covered
      for (let y = Math.max(0, top); y < Math.min(height, top + tileHeight); y++) {
        for (let x = Math.max(0, left); x < Math.min(width, left + tileWidth); x++) {
          mask.add(`${x},${y}`);
        }
      }
    }
    
    // Scan entire canvas for uncovered pixels (background color)
    let uncoveredPixels = 0;
    const sampleRate = 4; // Sample every 4th pixel for performance
    
    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const idx = (x + y * width) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Check if pixel matches background color
        const matchesBackground = (
          Math.abs(r - bgRgba.r) < tolerance &&
          Math.abs(g - bgRgba.g) < tolerance &&
          Math.abs(b - bgRgba.b) < tolerance
        );
        
        // Check if pixel is not in mask (uncovered)
        const isUncovered = !mask.has(`${x},${y}`);
        
        if (matchesBackground && isUncovered) {
          uncoveredPixels += (sampleRate * sampleRate); // Estimate total uncovered pixels
        }
      }
    }
    
    // Consider gaps if more than 0.1% of canvas is uncovered
    const totalPixels = width * height;
    const uncoveredPercentage = (uncoveredPixels / totalPixels) * 100;
    const hasGaps = uncoveredPercentage > 0.1;
    
    if (hasGaps) {
      console.log(`⚠️  [CANVAS] Gap validation: ${uncoveredPixels.toLocaleString()} uncovered pixels (${uncoveredPercentage.toFixed(2)}%)`);
    }
    
    return { hasGaps, uncoveredPixels };
  } catch (error) {
    console.warn("⚠️  [CANVAS] Gap validation failed:", error);
    return { hasGaps: false, uncoveredPixels: 0 };
  }
}
