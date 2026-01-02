import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@upstash/qstash";
import { FIREBASE_FUNCTION_URL } from "@/lib/constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are not set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { goals, email } = await request.json();

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { error: "Goals array is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
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

    // Create job record in database
    const { data: jobData, error: jobError } = await supabase
      .from("vision_board_jobs")
      .insert({
        email,
        goals: validGoals,
        status: "pending",
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
    const emailWebhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://rank-vision-board.vercel.app"}/api/send-email`;

    // Queue the job to Firebase Function via QStash
    try {
      const qstashResult = await qstash.publishJSON({
        url: FIREBASE_FUNCTION_URL,
        body: {
          jobId,
          goals: validGoals,
          email,
          emailWebhookUrl,
        },
      });

      // Update job with QStash message ID
      await supabase
        .from("vision_board_jobs")
        .update({ qstash_message_id: qstashResult.messageId })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        jobId,
        message: "Job created successfully",
      });
    } catch (qstashError: any) {
      console.error("Error queueing job:", qstashError);
      
      // Update job status to failed
      await supabase
        .from("vision_board_jobs")
        .update({ status: "failed", error_message: qstashError.message })
        .eq("id", jobId);

      return NextResponse.json(
        {
          error: "Failed to queue job",
          details: qstashError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

