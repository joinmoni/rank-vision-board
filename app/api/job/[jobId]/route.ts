import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are not set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
  try {
    // Handle both sync (Next.js < 15) and async (Next.js 15+) params
    const params = context.params instanceof Promise 
      ? await context.params 
      : context.params;
    
    console.log("API route params:", params);
    const jobId = params.jobId;
    console.log("Extracted jobId:", jobId);

    if (!jobId) {
      console.error("No jobId found in params:", params);
      return NextResponse.json(
        { error: "Job ID is required", debug: { receivedParams: params } },
        { status: 400 }
      );
    }

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

