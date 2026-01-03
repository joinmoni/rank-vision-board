export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rank-vision-board.vercel.app";

export const FIREBASE_FUNCTION_URL =
  process.env.FIREBASE_FUNCTION_URL ||
  "https://us-central1-uksv-functions.cloudfunctions.net/generateVisionBoardImage";

// Use local route for MVP (set USE_LOCAL_GENERATION=true to enable)
export const USE_LOCAL_GENERATION = process.env.USE_LOCAL_GENERATION === "true";
export const GENERATE_ROUTE = USE_LOCAL_GENERATION ? "/api/generate-local" : "/api/generate";


