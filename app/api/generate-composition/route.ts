/**
 * Vision Board Composition API Route
 * 
 * Uses Pexels images + OpenAI for text/search queries
 * Composes vision boards using canvas-based system
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Resend } from "resend";
import { PexelsProvider } from "@/lib/vision-board/image-provider";
import { composeVisionBoardFromGoals } from "@/lib/vision-board/orchestrator";
import { visionBoardCompleteEmail } from "@/lib/email-template";
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
  try {
    const { goals, email, vibe } = await request.json();

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { error: "Goals array is required" },
        { status: 400 }
      );
    }

    // Filter out empty goals
    const validGoals = goals.filter((goal: string) => goal.trim() !== "");

    if (validGoals.length === 0) {
      return NextResponse.json(
        { error: "At least one valid goal is required" },
        { status: 400 }
      );
    }

    // Check for required API keys
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!PEXELS_API_KEY) {
      return NextResponse.json(
        { error: "PEXELS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseClient();

    // Create job record in database
    const { data: jobData, error: jobError } = await supabase
      .from("vision_board_jobs")
      .insert({
        email: email || null,
        goals: validGoals,
        status: "processing",
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      return NextResponse.json(
        { error: "Failed to create job", details: jobError.message },
        { status: 500 }
      );
    }

    const jobId = jobData.id;

    try {
      // Initialize OpenAI and Pexels provider
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const imageProvider = new PexelsProvider(PEXELS_API_KEY);

      // Load logo
      const logoPath = join(process.cwd(), "public", "rank-logo.svg");

      // Generate vision board
      console.log(`Starting composition for job ${jobId}`);
      const result = await composeVisionBoardFromGoals({
        goals: validGoals,
        vibe: vibe || undefined,
        imageProvider,
        canvasSize: { width: 2048, height: 2048 },
        backgroundColor: "#F6F4F0",
        openai,
        logoPath,
      });

      console.log(`Composition complete. Used ${result.imagesUsed.length} images and ${result.textBlocks.length} text blocks.`);

      // Upload to Supabase Storage
      const fileName = `${jobId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("vision-boards")
        .upload(fileName, result.imageBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("vision-boards")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update database with completed status and image URL
      const { error: updateError } = await supabase
        .from("vision_board_jobs")
        .update({
          status: "complete",
          image_url: publicUrl,
          image_storage_path: fileName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      console.log(`Vision board generation completed for job ${jobId}`);

      // Send email directly if email provided
      if (email) {
        try {
          const boardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://rank-vision-board.vercel.app"}/board/${jobId}`;
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          await resend.emails.send({
            from: "Rank <vision2026@userank.com>",
            to: email,
            subject: "Your 2026 Vision Board is Ready!",
            html: visionBoardCompleteEmail(boardUrl),
            text: `Hi there! Your vision board is ready. View it here: ${boardUrl}`,
          });

          console.log(`Vision board completion email sent successfully to ${email}`);
        } catch (emailError) {
          console.error("Failed to send vision board completion email:", emailError);
          // Don't fail the whole job if email fails
        }
      }

      return NextResponse.json({
        success: true,
        jobId,
        imageUrl: publicUrl,
        message: "Vision board generated successfully",
      });
    } catch (error: any) {
      console.error(`Error generating vision board for job ${jobId}:`, error);

      // Update job status to failed
      await supabase
        .from("vision_board_jobs")
        .update({
          status: "failed",
          error_message: error.message || "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json(
        {
          error: "Failed to generate vision board",
          details: error.message || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate-composition route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}



