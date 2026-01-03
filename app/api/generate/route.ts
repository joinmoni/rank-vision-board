import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import { Client } from "@upstash/qstash";
// import { FIREBASE_FUNCTION_URL } from "@/lib/constants";
import OpenAI from "openai";
import { PexelsProvider } from "@/lib/vision-board/image-provider";
import { composeVisionBoardFromGoals } from "@/lib/vision-board/orchestrator";
import { readFile } from "fs/promises";
import { join } from "path";

// Commented out for debugging
// function getSupabaseClient() {
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

//   if (!supabaseUrl || !supabaseServiceKey) {
//     throw new Error("Supabase environment variables are not set");
//   }

//   return createClient(supabaseUrl, supabaseServiceKey);
// }

// function getQStashClient() {
//   const token = process.env.QSTASH_TOKEN;
//   if (!token) {
//     throw new Error("QSTASH_TOKEN environment variable is not set");
//   }
//   return new Client({ token });
// }

export async function POST(request: NextRequest) {
  console.log("🚀 [GENERATE] Route called");
  console.log("📅 [GENERATE] Timestamp:", new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log("📦 [GENERATE] Request body:", JSON.stringify(body, null, 2));
    
    const { goals, email, useComposition } = body;

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      console.error("❌ [GENERATE] No goals provided");
      return NextResponse.json(
        { error: "Goals array is required" },
        { status: 400 }
      );
    }

    // Filter out empty goals
    const validGoals = goals.filter((goal: string) => goal.trim() !== "");
    console.log("✅ [GENERATE] Valid goals:", validGoals);

    if (validGoals.length === 0) {
      console.error("❌ [GENERATE] No valid goals after filtering");
      return NextResponse.json(
        { error: "At least one valid goal is required" },
        { status: 400 }
      );
    }

    // Simplified: Always use composition for debugging
    console.log("🎨 [GENERATE] Using composition system");
    
    try {
      // Check for required API keys
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

      console.log("🔑 [GENERATE] Checking API keys...");
      console.log("   - OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ Set" : "❌ Missing");
      console.log("   - PEXELS_API_KEY:", PEXELS_API_KEY ? "✅ Set" : "❌ Missing");

      if (!PEXELS_API_KEY) {
        console.error("❌ [GENERATE] PEXELS_API_KEY is not configured");
        throw new Error("PEXELS_API_KEY is not configured");
      }

      // Initialize Pexels provider
      console.log("🖼️  [GENERATE] Initializing Pexels provider...");
      const imageProvider = new PexelsProvider(PEXELS_API_KEY);
      console.log("✅ [GENERATE] Pexels provider initialized");

      // Initialize OpenAI (optional for now, we'll use dummy text)
      let openai: OpenAI | undefined;
      if (OPENAI_API_KEY) {
        console.log("🤖 [GENERATE] Initializing OpenAI...");
        openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        console.log("✅ [GENERATE] OpenAI initialized");
      } else {
        console.log("⚠️  [GENERATE] OpenAI not configured, will use dummy text");
      }

      // Load logo
      const logoPath = join(process.cwd(), "public", "rank-logo.svg");
      console.log("🖼️  [GENERATE] Logo path:", logoPath);

      // Generate vision board
      console.log("🎨 [GENERATE] Starting composition...");
      console.log("   - Goals:", validGoals);
      console.log("   - Canvas size: 2048x2048");
      
      const startTime = Date.now();
      
      const result = await composeVisionBoardFromGoals({
        goals: validGoals,
        imageProvider,
        canvasSize: { width: 1654, height: 2339 }, // A4 aspect ratio for dense tiling
        backgroundColor: "#F6F4F0",
        openai: openai, // Will use dummy text if not available
        logoPath,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [GENERATE] Composition complete in ${duration}ms`);
      console.log(`   - Images used: ${result.imagesUsed.length}`);
      console.log(`   - Text blocks: ${result.textBlocks.length}`);
      console.log(`   - Layout template: ${result.layoutTemplate}`);

      // Convert buffer to base64 for direct return
      const base64Image = result.imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      
      console.log("✅ [GENERATE] Image converted to base64");
      console.log(`   - Image size: ${result.imageBuffer.length} bytes`);
      console.log(`   - Base64 length: ${base64Image.length} chars`);

      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
        message: "Vision board generated successfully",
        debug: {
          imagesUsed: result.imagesUsed.length,
          textBlocks: result.textBlocks,
          layoutTemplate: result.layoutTemplate,
          duration: `${duration}ms`,
        },
      });
    } catch (compositionError: any) {
      console.error("❌ [GENERATE] Error in composition generation:");
      console.error("   - Message:", compositionError.message);
      console.error("   - Stack:", compositionError.stack);
      
      return NextResponse.json(
        {
          error: "Failed to generate vision board",
          details: compositionError.message || "Unknown error",
          stack: process.env.NODE_ENV === "development" ? compositionError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ [GENERATE] Error in generate route:");
    console.error("   - Message:", error.message);
    console.error("   - Stack:", error.stack);
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
