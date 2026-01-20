import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses Promise)
    const params = await Promise.resolve(context.params);
    const jobId = params.jobId;

    if (!jobId) {
      console.error("No jobId found in params:", params);
      return NextResponse.json(
        { error: "Job ID is required", debug: { receivedParams: params } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data: job, error } = await supabase
      .from("vision_board_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      return NextResponse.json(
        { error: "Job not found", details: error.message },
        { status: 404 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      imageUrl: job.image_url,
      goals: job.goals,
      email: job.email,
      name: job.name,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  } catch (error: any) {
    console.error("Error in job status route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

