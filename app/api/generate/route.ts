import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@upstash/qstash";
import { LAMBDA_FUNCTION_URL, APP_URL } from "@/lib/constants";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN environment variable is not set");
  }
  return new Client({ token });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goals, email } = body;

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

    const supabase = getSupabaseClient();

    // Create job in Supabase
    const { data: job, error: jobError } = await supabase
      .from("vision_board_jobs")
      .insert({
        email: email || null,
        goals: validGoals,
        status: "pending",
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Error creating job:", jobError);
      return NextResponse.json(
        { error: "Failed to create job", details: jobError?.message },
        { status: 500 }
      );
    }

    const jobId = job.id;

    // Queue job to AWS Lambda via QStash
    const qstash = getQStashClient();

    try {
      const result = await qstash.publishJSON({
        url: LAMBDA_FUNCTION_URL,
        body: {
          jobId,
          goals: validGoals,
          email: email || null,
        },
      });

      // Update job with QStash message ID
      await supabase
        .from("vision_board_jobs")
        .update({
          qstash_message_id: result.messageId,
          status: "processing",
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        jobId,
        message: "Vision board generation started",
      });
    } catch (qstashError: any) {
      console.error("Error queueing job to Lambda Function:", qstashError);
      
      // Update job status to failed
      await supabase
        .from("vision_board_jobs")
        .update({
          status: "failed",
          error_message: qstashError.message || "Failed to queue job",
        })
        .eq("id", jobId);

      return NextResponse.json(
        {
          error: "Failed to queue job",
          details: qstashError.message || "Unknown error",
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
