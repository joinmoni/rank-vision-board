import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { visionBoardCompleteEmail } from "../../../lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

export const POST = verifySignatureAppRouter(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, jobId, boardUrl } = body;

    if (!email || !boardUrl) {
      return NextResponse.json(
        { error: "Missing required fields: email and boardUrl" },
        { status: 400 }
      );
    }

    console.log(`Sending email to ${email} for job ${jobId}`);

    await resend.emails.send({
      from: "hello@ukschengenappointments.com",
      to: email,
      subject: "Your 2026 Vision Board is Ready!",
      html: visionBoardCompleteEmail(boardUrl),
      text: `Hi there! Your vision board is ready. View it here: ${boardUrl}`,
    });

    console.log(`Email sent successfully to ${email}`);

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
});

