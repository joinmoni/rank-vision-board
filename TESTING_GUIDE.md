# Testing Guide - Vision Board App

## Prerequisites

1. **Node.js** installed (v18+)
2. **npm** or **yarn** package manager
3. **API Keys**:
   - OpenAI API key
   - Pexels API key (get from https://www.pexels.com/api/)
   - Supabase credentials (already configured)

## Step 1: Environment Setup

Create or update `.env.local` in the project root:

```bash
# OpenAI (for search queries and text generation)
OPENAI_API_KEY=sk-your-openai-key-here

# Pexels (for image fetching)
PEXELS_API_KEY=your-pexels-api-key-here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://lbxtldblursbyqmtftfg.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Site URL (for email notifications)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# QStash (for Firebase Functions - optional if using composition)
QSTASH_TOKEN=your-qstash-token
```

**Get Pexels API Key:**
1. Go to https://www.pexels.com/api/
2. Sign up or log in
3. Create a new application
4. Copy your API key

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Step 4: Test the New Composition System

### Option A: Update Frontend to Use Composition (Recommended)

Update `app/create/page.tsx` to add the `useComposition` flag:

```typescript
body: JSON.stringify({
  goals: validGoals,
  email: email.trim() || undefined,
  useComposition: true, // Add this line
}),
```

### Option B: Test via API Directly

You can test the composition endpoint directly using curl or Postman:

```bash
curl -X POST http://localhost:3000/api/generate-composition \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["Run a marathon", "Travel to Japan", "Learn photography"],
    "email": "test@example.com"
  }'
```

Or test with the flag:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["Run a marathon", "Travel to Japan"],
    "email": "test@example.com",
    "useComposition": true
  }'
```

## Step 5: Testing Flow

### Test Scenario 1: New Composition System (Pexels)

1. **Navigate to** http://localhost:3000/create
2. **Enter goals** (at least 2):
   - "Run a marathon"
   - "Travel to Japan"
   - "Learn photography"
3. **Enter email** (optional): `test@example.com`
4. **Click "Generate Board"**
5. **Expected behavior**:
   - Job is created immediately
   - Status updates to "processing"
   - Images are fetched from Pexels
   - OpenAI generates search queries and text
   - Canvas is composed
   - Image is uploaded to Supabase
   - Status updates to "complete"
   - You're redirected to `/board/[jobId]`
   - Vision board displays with real lifestyle images

### Test Scenario 2: Original System (Firebase Functions)

1. **Navigate to** http://localhost:3000/create
2. **Enter goals** (at least 2)
3. **Click "Generate Board"** (without `useComposition` flag)
4. **Expected behavior**:
   - Job is queued to Firebase Functions via QStash
   - Takes 60-90 seconds
   - Uses OpenAI image generation

## Step 6: Check Job Status

Visit: `http://localhost:3000/board/[jobId]`

Replace `[jobId]` with the job ID returned from the API.

The page will:
- Poll the job status every 2 seconds
- Show loading state while processing
- Display the final image when complete
- Show error if generation fails

## Step 7: Verify Results

### Check Supabase Storage

1. Go to your Supabase dashboard
2. Navigate to Storage → `vision-boards` bucket
3. Verify the image was uploaded: `[jobId].jpg`

### Check Database

1. Go to Supabase → Table Editor → `vision_board_jobs`
2. Find your job by ID
3. Verify:
   - `status` = "complete"
   - `image_url` is populated
   - `goals` array is correct

## Step 8: Debugging

### Check Server Logs

Watch the terminal where `npm run dev` is running for:
- API request logs
- Error messages
- Image fetching progress
- Composition status

### Common Issues

**1. "PEXELS_API_KEY is not configured"**
- Add `PEXELS_API_KEY` to `.env.local`
- Restart the dev server

**2. "OPENAI_API_KEY is not configured"**
- Add `OPENAI_API_KEY` to `.env.local`
- Restart the dev server

**3. "Failed to upload to Supabase Storage"**
- Check `SUPABASE_SERVICE_KEY` is correct
- Verify bucket `vision-boards` exists
- Check bucket permissions

**4. Images not loading**
- Check Pexels API key is valid
- Verify network requests in browser DevTools
- Check API rate limits

**5. Composition takes too long**
- Check OpenAI API response times
- Verify Pexels API is responding
- Check image download speeds

## Step 9: Test Different Scenarios

### Test with Different Goals

Try various goal types:
- Fitness: "Run a marathon", "Lose 20 pounds"
- Travel: "Visit Japan", "Backpack through Europe"
- Career: "Get promoted", "Start a business"
- Personal: "Learn Spanish", "Read 50 books"

### Test with Different Vibes

If you add vibe support to the frontend:
```typescript
body: JSON.stringify({
  goals: validGoals,
  email: email.trim() || undefined,
  useComposition: true,
  vibe: "fitness", // "soft-life" | "luxury" | "fitness" | "career" | "travel"
}),
```

### Test Layout Templates

The system randomly selects from 3 templates:
- `editorial_grid` - Magazine style
- `soft_collage` - Organic, overlapping
- `minimal_blocks` - Clean, spacious

Generate multiple boards to see different layouts.

## Step 10: Performance Testing

### Expected Timings

**New Composition System:**
- Job creation: < 1 second
- Image fetching: 5-10 seconds
- OpenAI queries: 2-5 seconds
- Canvas composition: 3-5 seconds
- Upload: 1-2 seconds
- **Total: ~15-25 seconds**

**Original System (Firebase Functions):**
- Job creation: < 1 second
- Queue to Firebase: < 1 second
- OpenAI image generation: 60-90 seconds
- **Total: ~60-90 seconds**

## Quick Test Checklist

- [ ] Environment variables set in `.env.local`
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] Can access http://localhost:3000/create
- [ ] Can enter goals and generate board
- [ ] Job status updates correctly
- [ ] Image appears on `/board/[jobId]` page
- [ ] Image is uploaded to Supabase Storage
- [ ] Email notification works (if email provided)

## Next Steps

Once testing is successful:
1. Update frontend to use `useComposition: true` by default
2. Deploy to Vercel
3. Add environment variables to Vercel dashboard
4. Test in production

