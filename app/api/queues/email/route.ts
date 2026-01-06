import { Client } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { APP_URL } from "@/lib/constants";

const client = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, jobId, boardUrl } = body;

    if (!email || !jobId || !boardUrl) {
      return NextResponse.json(
        { error: "Missing required fields: email, jobId, boardUrl" },
        { status: 400 }
      );
    }

    console.log(`Queueing email to ${email} for job ${jobId}`);

    const result = await client.publishJSON({
      url: `${APP_URL}/api/send-email`,
      body: { email, jobId, boardUrl },
    });

    if (result.messageId) {
      console.log(`Email queued successfully: ${result.messageId}`);
    }

    return NextResponse.json({
      message: "Email queued for processing!",
      qstashMessageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Error queueing email:", error);
    return NextResponse.json(
      {
        error: "Failed to queue email",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}



