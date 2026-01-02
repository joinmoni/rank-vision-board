# Vision Board Background Generation Implementation

## Summary

This implementation moves image generation to Firebase Functions with background processing using QStash, Supabase Storage, and Resend for email notifications.

## Architecture

1. **User submits goals** → `/api/generate` creates job in Supabase
2. **Job queued** → QStash triggers Firebase Function
3. **Firebase Function** → Generates image with OpenAI, adds logo with Sharp, uploads to Supabase Storage
4. **On completion** → Triggers email queue via `/api/queues/email`
5. **Email sent** → QStash calls `/api/send-email` which sends email via Resend
6. **User notified** → Email with link to view board

## Files Created/Modified

### Firebase Functions (`/Users/adebolaadeniran/Documents/schengen-functions/functions/`)

1. **`src/functions.ts`**
   - Added `generateVisionBoard()` function
   - Implements OpenAI image generation
   - Adds Rank logo using Sharp (top-left, white)
   - Uploads to Supabase Storage bucket `vision-boards`
   - Updates job status in database

2. **`src/index.ts`**
   - Added `generateVisionBoardImage` export using v2 functions
   - Configured with 540s timeout, 1GiB memory

3. **`src/email.ts`**
   - Added `visionBoardCompleteEmail()` template function

4. **`package.json`**
   - Added `sharp` and `openai` dependencies
   - Added `copy-assets` script to copy logo to `lib/assets/` during build

5. **`src/assets/rank-logo.svg`**
   - Logo file copied from rank-vision-board/public/

### Next.js API Routes (`/Users/adebolaadeniran/Documents/rank-vision-board/`)

1. **`lib/constants.ts`**
   - `APP_URL` constant
   - `FIREBASE_FUNCTION_URL` constant

2. **`app/api/generate/route.ts`**
   - Creates job in Supabase
   - Queues job to Firebase Function via QStash
   - Returns job ID immediately

3. **`app/api/queues/email/route.ts`**
   - Receives request to queue email
   - Publishes to QStash for `/api/send-email`

4. **`app/api/send-email/route.ts`**
   - Verified endpoint (uses `verifySignatureAppRouter`)
   - Sends email via Resend

5. **`app/api/job/[jobId]/route.ts`**
   - GET endpoint to check job status
   - Returns job data including status, image URL, goals, etc.

6. **`lib/email-template.ts`**
   - HTML email template for vision board completion

7. **`package.json`**
   - Added `@upstash/qstash` and `resend` dependencies

## Database Schema

See `lib/vision-board-jobs-schema.md` for the Supabase table schema.

## Environment Variables Required

### Firebase Functions
- `OPENAI_API_KEY` - OpenAI API key
- `SUPABASE_URL` - Supabase project URL (or use NEXT_PUBLIC_SUPABASE_URL)
- `SUPABASE_SERVICE_KEY` - Supabase service role key

### Next.js App
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (server-side only)
- `NEXT_PUBLIC_SITE_URL` - App URL (defaults to rank-vision-board.vercel.app)
- `QSTASH_TOKEN` - Upstash QStash token
- `RESEND_API_KEY` - Resend API key
- `FIREBASE_FUNCTION_URL` - Firebase Function URL (optional, has default)

## Setup Steps

1. **Create Supabase Storage bucket:**
   - Create bucket named `vision-boards`
   - Make it public or configure CORS as needed

2. **Run database migration:**
   - Execute SQL from `lib/vision-board-jobs-schema.md` in Supabase

3. **Set Firebase Function environment variables:**
   ```bash
   firebase functions:config:set openai.api_key="your-key"
   firebase functions:config:set supabase.url="your-url"
   firebase functions:config:set supabase.service_key="your-key"
   ```
   Or set in Firebase Console → Functions → Configuration

4. **Build and deploy Firebase Functions:**
   ```bash
   cd /Users/adebolaadeniran/Documents/schengen-functions/functions
   npm install
   npm run build
   firebase deploy --only functions:generateVisionBoardImage
   ```

5. **Update FIREBASE_FUNCTION_URL:**
   - Get the deployed function URL from Firebase Console
   - Update in `.env.local` or `lib/constants.ts`

6. **Install Next.js dependencies:**
   ```bash
   cd /Users/adebolaadeniran/Documents/rank-vision-board
   npm install
   ```

## Notes

- Logo is positioned at top-left with 4% padding (matching client-side implementation)
- Logo is converted to white using Sharp's `tint()` method
- Images are stored in Supabase Storage bucket `vision-boards`
- Firebase Function uses v2 with 540s timeout (9 minutes max)
- Email uses Resend with sender `hello@userank.com`
- Job statuses: `pending` → `processing` → `complete` or `failed`

## Next Steps

1. Update client-side code to use new `/api/generate` endpoint
2. Update `/board` page to support job ID-based URLs (`/board/[jobId]`)
3. Implement polling or WebSocket for real-time status updates
4. Test end-to-end flow

