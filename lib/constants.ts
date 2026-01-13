export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visionboard.userank.com";

export const LAMBDA_FUNCTION_URL =
  process.env.LAMBDA_FUNCTION_URL ||
  "https://u3i7fuirmamsk4txqqd3b65uhy0secyh.lambda-url.us-east-1.on.aws/";

// Use Lambda for server-side generation (production)
export const USE_LOCAL_GENERATION = false;
export const GENERATE_ROUTE = "/api/generate";


