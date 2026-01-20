/**
 * Local MVP Route - Generates vision board directly in Next.js API route
 * 
 * This route uses the same composition logic as AWS Lambda but runs locally.
 * Use this as a fallback/MVP while debugging Lambda Functions.
 * 
 * Returns the image as base64 or uploads to Supabase Storage (configurable).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { PexelsProvider } from "@/lib/vision-board/image-provider";
import { composeVisionBoardFromGoals } from "@/lib/vision-board/orchestrator";
import { readFile } from "fs/promises";
import { join } from "path";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  console.log("🚀 [GENERATE-LOCAL] Route called");
  console.log("📅 [GENERATE-LOCAL] Timestamp:", new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log("📦 [GENERATE-LOCAL] Request body:", JSON.stringify(body, null, 2));
    
    const { goals, email, vibe, uploadToStorage = true } = body;

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      console.error("❌ [GENERATE-LOCAL] No goals provided");
      return NextResponse.json(
        { error: "Goals array is required" },
        { status: 400 }
      );
    }

    // Filter out empty goals
    const validGoals = goals.filter((goal: string) => goal.trim() !== "");
    console.log("✅ [GENERATE-LOCAL] Valid goals:", validGoals);

    if (validGoals.length === 0) {
      console.error("❌ [GENERATE-LOCAL] No valid goals after filtering");
      return NextResponse.json(
        { error: "At least one valid goal is required" },
        { status: 400 }
      );
    }

    // Check for required API keys
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error("❌ [GENERATE-LOCAL] OPENAI_API_KEY not configured");
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!PEXELS_API_KEY) {
      console.error("❌ [GENERATE-LOCAL] PEXELS_API_KEY not configured");
      return NextResponse.json(
        { error: "PEXELS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Create job in Supabase (optional, for tracking)
    let jobId: string | null = null;
    const supabase = getSupabaseClient();
    
    try {
      const { data: job, error: jobError } = await supabase
        .from("vision_board_jobs")
        .insert({
          email: email || null,
          goals: validGoals,
          status: "processing",
        })
        .select()
        .single();

      if (!jobError && job) {
        jobId = job.id;
        console.log(`✅ [GENERATE-LOCAL] Created job ${jobId}`);
      } else {
        console.warn("⚠️  [GENERATE-LOCAL] Could not create job (non-fatal):", jobError?.message);
      }
    } catch (jobErr) {
      console.warn("⚠️  [GENERATE-LOCAL] Could not create job (non-fatal):", jobErr);
      // Continue without job tracking
    }

    // Initialize OpenAI and Pexels provider
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const imageProvider = new PexelsProvider(PEXELS_API_KEY);

    // Load logo
    const logoPath = join(process.cwd(), "public", "rank-logo-white.png");

    // Generate vision board
    console.log(`🎨 [GENERATE-LOCAL] Starting composition...`);
    const result = await composeVisionBoardFromGoals({
      goals: validGoals,
      vibe: vibe || undefined,
      imageProvider,
      canvasSize: { width: 1654, height: 2339 }, // A4 aspect ratio
      backgroundColor: "#F6F4F0",
      openai,
      logoPath,
    });

    console.log(`✅ [GENERATE-LOCAL] Composition complete. Used ${result.imagesUsed.length} images and ${result.textBlocks.length} text blocks.`);

    // Upload to Supabase Storage if requested
    let imageUrl: string | null = null;
    if (uploadToStorage && jobId) {
      try {
        console.log("📤 [GENERATE-LOCAL] Uploading to Supabase Storage...");
        const fileName = `${jobId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("vision-boards")
          .upload(fileName, result.imageBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ [GENERATE-LOCAL] Upload error:", uploadError);
          throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("vision-boards")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
        console.log(`✅ [GENERATE-LOCAL] Uploaded to: ${imageUrl}`);

        // Update job status
        await supabase
          .from("vision_board_jobs")
          .update({
            status: "complete",
            image_url: imageUrl,
            image_storage_path: fileName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } catch (uploadErr: any) {
        console.error("❌ [GENERATE-LOCAL] Storage upload failed:", uploadErr);
        // Fall through to base64 response
      }
    }

    // Return response
    if (imageUrl && jobId) {
      // Return job-based response (matches Lambda Functions flow)
      return NextResponse.json({
        success: true,
        jobId,
        imageUrl,
        message: "Vision board generated successfully",
      });
    } else {
      // Return base64 image directly (for immediate display)
      const base64Image = result.imageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      return NextResponse.json({
        success: true,
        jobId: jobId || null,
        imageDataUrl: dataUrl,
        message: "Vision board generated successfully",
      });
    }
  } catch (error: any) {
    console.error("❌ [GENERATE-LOCAL] Error in generate-local route:", {
      message: error.message,
      stack: error.stack,
    });

    // Update job status to failed if we have a jobId
    if (error.jobId) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from("vision_board_jobs")
          .update({
            status: "failed",
            error_message: error.message || "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", error.jobId);
      } catch (updateErr) {
        console.error("Failed to update job status:", updateErr);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate vision board",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}



