export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rank-vision-board.vercel.app";

export const LAMBDA_FUNCTION_URL =
  process.env.LAMBDA_FUNCTION_URL ||
  "https://u3i7fuirmamsk4txqqd3b65uhy0secyh.lambda-url.us-east-1.on.aws/";

// Use local route for MVP (set USE_LOCAL_GENERATION=true to enable)
export const USE_LOCAL_GENERATION = process.env.USE_LOCAL_GENERATION === "true";
export const GENERATE_ROUTE = USE_LOCAL_GENERATION ? "/api/generate-local" : "/api/generate";


