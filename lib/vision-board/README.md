# Vision Board Composition System

Canvas-based vision board generation using **real lifestyle images from Pexels** + **OpenAI for intelligence**.

## Overview

This system replaces AI image generation with a composition-based approach:
- **Pexels** for real lifestyle photography
- **OpenAI** for converting goals → search queries and generating motivational text
- **Sharp** for canvas composition
- **Deterministic layouts** for consistent, beautiful results

## Architecture

### Components

1. **Layout Engine** (`layout.ts`)
   - 3 templates: `editorial_grid`, `soft_collage`, `minimal_blocks`
   - Pure functions generating layout slots

2. **Image Provider** (`image-provider.ts`)
   - Pluggable interface
   - `PexelsProvider` (primary) - optimized for lifestyle/social media
   - `UnsplashProvider` (available) - can be swapped in

3. **AI Prompts** (`ai-prompts.ts`)
   - Converts goals → Pexels-friendly search queries
   - Generates motivational text blocks

4. **Canvas Composition** (`canvas.ts`)
   - Uses Sharp to compose images + text
   - Center-weighted cropping
   - SVG text overlays

5. **Orchestrator** (`orchestrator.ts`)
   - Main entry point: `composeVisionBoardFromGoals()`

## Usage

### Option 1: Use `/api/generate` with flag

```typescript
// Frontend
const response = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    goals: ["Run a marathon", "Travel to Japan"],
    email: "user@example.com",
    useComposition: true, // Enable Pexels-based composition
  }),
});
```

### Option 2: Use `/api/generate-composition` directly

```typescript
// Frontend
const response = await fetch("/api/generate-composition", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    goals: ["Run a marathon", "Travel to Japan"],
    email: "user@example.com",
    vibe: "fitness", // Optional: "soft-life" | "luxury" | "fitness" | "career" | "travel"
  }),
});
```

## Environment Variables

Required in `.env.local`:

```bash
# OpenAI (for search queries and text generation)
OPENAI_API_KEY=sk-...

# Pexels (for image fetching)
PEXELS_API_KEY=your_pexels_api_key

# Supabase (for storage and jobs)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```

Get Pexels API key: https://www.pexels.com/api/

## How It Works

1. **User submits goals** → API creates job record
2. **OpenAI converts goals** → Pexels search queries (8-15 queries)
   - Example: "I want peace" → "slow morning routine aesthetic"
3. **Pexels fetches images** → Real lifestyle photos (10 per query)
4. **OpenAI generates text** → 2-3 motivational affirmations
5. **Layout engine** → Selects template, creates slots
6. **Canvas composition** → Places images + text + logo
7. **Upload to Supabase** → Stores final image
8. **Email notification** → User receives link

## Layout Templates

### Editorial Grid
- Clean, magazine-style
- 10 image slots + 2 text slots
- Intentional asymmetry

### Soft Collage
- Organic, overlapping feel
- 7 image slots + 2 text slots
- Varied sizes

### Minimal Blocks
- Clean, spacious
- 6 image slots + 2 text slots
- Fewer images, more breathing room

## Switching Image Providers

To switch from Pexels to Unsplash (or another provider):

```typescript
import { UnsplashProvider } from "@/lib/vision-board/image-provider";

const imageProvider = new UnsplashProvider(UNSPLASH_API_KEY);
```

No changes needed to layout or canvas code!

## Benefits Over AI Generation

✅ **Faster** - No 60-90s wait for AI generation  
✅ **More realistic** - Real lifestyle photography  
✅ **No artifacts** - No warped hands/faces  
✅ **Deterministic** - Consistent layouts  
✅ **Legal clarity** - Proper image licensing  
✅ **Creditable** - Can credit photographers  

## Keeping Both Methods

The original OpenAI image generation route (`/api/ai`) is preserved and can still be used independently. The composition system is opt-in via the `useComposition` flag.

