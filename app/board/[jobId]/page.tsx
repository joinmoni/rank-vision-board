"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function BoardPageByJobId() {
  const params = useParams();
  const jobId = params?.jobId as string;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [shareCaptionCopied, setShareCaptionCopied] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const shareCaptionText = `I used the Rank vision board app to create my 2026 vision board! Check it out here: ${process.env.NEXT_PUBLIC_SITE_URL || "https://visionboard.userank.com"}`;

  // Poll for job status
  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided");
      setLoading(false);
      return;
    }

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/job/${jobId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data = await response.json();
        setJobStatus(data.status);
        setGoals(data.goals || []);
        setName(data.name || "");

        if (data.status === "complete" && data.imageUrl) {
          setImageUrl(data.imageUrl);
          setLoading(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (data.status === "failed") {
          setError(data.errorMessage || "Image generation failed. Please try again.");
          setLoading(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        // If pending or processing, continue polling
      } catch (err) {
        console.error("Error polling job status:", err);
        // Don't stop polling on network errors, just log
      }
    };

    // Poll immediately, then every 3 seconds
    pollJobStatus();
    pollingIntervalRef.current = setInterval(pollJobStatus, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [jobId]);

  // Progress bar effect (90 seconds, capped at 99% until image loads)
  useEffect(() => {
    if (!loading) {
      setProgress(100);
      setTimeout(() => setProgress(0), 100);
      return;
    }

    const totalTime = 90;
    const interval = 100;
    const increment = 99 / (totalTime * 10);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) {
          return 99;
        }
        return Math.min(prev + increment, 99);
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [loading]);

  const handleDownload = async () => {
    if (!imageUrl) {
      alert("No image available to download. Please wait for the vision board to be generated.");
      return;
    }

    try {
      // Since logo is already on the image from backend, just download directly
      // Fetch image as blob to handle CORS
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const element = document.createElement('a');
      const filename = 'vision-board-2026.jpg';
      element.href = url;
      element.download = filename;
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading image:", err);
      // Fallback: open image in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (!imageUrl) {
      alert("No image available to share. Please wait for the vision board to be generated.");
      return;
    }

    try {
      // Since logo is already on the image from backend, just fetch and share
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }
      const blob = await response.blob();
      const file = new File([blob], 'vision-board-2026.jpg', { type: 'image/jpeg' });

      // Try Web Share API (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "My 2026 Vision Board",
              text: shareCaptionText,
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://visionboard.userank.com",
            });
            // Many mobile apps ignore text when sharing a file—copy caption to clipboard so user can paste it
            try {
              await navigator.clipboard.writeText(shareCaptionText);
              setShareCaptionCopied(true);
              setTimeout(() => setShareCaptionCopied(false), 5000);
            } catch (_) {}
            return;
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            return; // User cancelled
          }
          // Fall through to clipboard
        }
      }

      // Fallback: Copy to clipboard (desktop)
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/jpeg': blob,
            }),
          ]);
          alert("Image copied to clipboard!");
          return;
        } catch (clipboardErr) {
          console.error("Clipboard error:", clipboardErr);
        }
      }

      // Final fallback: download
      const url = window.URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = 'vision-board-2026.jpg';
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error sharing image:", err);
      alert(`Failed to share image: ${err?.message || "Unknown error"}. Please try again.`);
    }
  };

  // Copy the rest of the JSX from the original board/page.tsx
  // For brevity, I'll include the key parts
  // Calculate stroke-dashoffset for circular progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~440
  const strokeDashoffset = circumference - (circumference * progress / 100);

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden relative">
      {loading ? (
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Left side - Text (Maroon background - Desktop only) */}
          <div className="hidden lg:flex lg:w-1/2 bg-[#3E0000] flex-col justify-center px-8 md:px-16 lg:px-24 py-12 relative">
            {/* White Logo overlay on maroon background (Desktop only) */}
            <div className="absolute top-8 left-8 z-10">
              <Link href="https://rankvisionboard.framer.website/">
                <Image
                  src="/rank-logo-white.svg"
                  alt="Rank Logo"
                  width={120}
                  height={35}
                  priority
                  className="h-6 w-auto"
                />
              </Link>
            </div>
            <h1 className="text-white text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-8">
              Creating your<br />2026 vision board...
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-md leading-relaxed">
              Feel free to navigate away from this page. We'll notify you via email when it's ready, or you can come back to this page later.
            </p>
          </div>

          {/* Right side - Circular Progress Loader (Full width on mobile, centered) */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 min-h-screen lg:min-h-0">
            <div className="w-full max-w-lg aspect-square border border-orange-100 rounded-[60px] flex flex-col items-center justify-center p-12 text-center">
              <div className="relative flex items-center justify-center mb-8 w-32 h-32 md:w-40 md:h-40 shrink-0">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 160 160"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden
                >
                  <circle
                    className="text-gray-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="80"
                    cy="80"
                  />
                  <circle
                    className="text-[#3E0000] progress-ring__circle"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="80"
                    cy="80"
                    style={{
                      transition: "stroke-dashoffset 0.35s",
                      transform: "rotate(-90deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl font-black text-[#3E0000] pointer-events-none">
                  {Math.round(progress)}%
                </span>
              </div>
              <p className="hidden lg:block text-xl md:text-2xl font-medium text-gray-800 leading-snug max-w-xs">
                Our design intern is cooking up your vision board. Give her a minute.
              </p>
              <p className="lg:hidden text-base sm:text-lg font-medium text-gray-800 leading-snug max-w-xs px-2">
                You can navigate away from this page. We&apos;ll send your vision board to your email.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-white text-black overflow-hidden">
          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="px-6 pt-6 pb-8">
              {/* Logo */}
              <div className="mb-8">
                <Link href="https://rankvisionboard.framer.website/" className="flex items-center gap-2">
                  <Image
                    src="/rank-logo-black.svg"
                    alt="Rank Logo"
                    width={120}
                    height={35}
                    priority
                    className="h-6 w-auto"
                  />
                </Link>
              </div>

              {/* Heading */}
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-[0.95] mb-4 text-black">
                Your 2026 vision board is complete
              </h1>

              {/* Description */}
              <p className="text-lg mb-8 text-gray-700 leading-snug">
                Take a moment to pause, reflect, and see your goals come to life.
              </p>

              {/* Image Section (White background on mobile) */}
              {imageUrl ? (
                <div className="relative bg-white rounded-2xl p-6 mb-6 min-h-[500px] flex flex-col">
                  {/* Vision Board Image Card */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-sm">
                      <img
                        src={imageUrl}
                        alt="Vision Board"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-white border border-red-200 rounded-2xl p-6 mb-6 min-h-[300px] flex items-center justify-center">
                  <p className="text-red-700 text-center">{error}</p>
                </div>
              ) : null}

              {/* Buttons */}
              {imageUrl && (
                <div className="mb-6">
                  <div className="flex flex-row gap-4 mb-2">
                    <button
                      onClick={handleShare}
                      disabled={!imageUrl}
                      className="flex-1 px-6 py-4 bg-gray-200 text-black font-bold rounded-2xl hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Share Board
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!imageUrl}
                      className="flex-1 px-6 py-4 bg-gray-200 text-black font-bold rounded-2xl hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                  </div>
                  {shareCaptionCopied && (
                    <p className="text-sm text-gray-600 mt-2">
                      Caption copied to clipboard—paste it into your post or message if it didn&apos;t appear.
                    </p>
                  )}
                </div>
              )}

              {/* Create New Link */}
              <Link
                href="/create"
                className="text-black font-bold underline underline-offset-4 decoration-2 hover:text-gray-700 inline-block"
              >
                Create a new vision board
              </Link>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex flex-row min-h-screen">
            {/* Left side - Maroon background with text and buttons */}
            <div className="w-1/2 bg-[#3E0000] flex flex-col justify-center px-16 lg:px-24 py-12 relative">
              {/* White Logo overlay on maroon background (Desktop only) */}
              <div className="absolute top-8 left-8 z-10">
                <Link href="https://rankvisionboard.framer.website/">
                  <Image
                    src="/rank-logo-white.svg"
                    alt="Rank Logo"
                    width={120}
                    height={35}
                    priority
                    className="h-6 w-auto"
                  />
                </Link>
              </div>
              <h1 className="text-white text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-6">
                Your 2026 vision board is complete
              </h1>
              <p className="text-white/80 text-lg md:text-xl max-w-sm mb-12 leading-snug">
                Take a moment to pause, reflect, and see your goals come to life.
              </p>

              {/* Error State */}
              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Buttons */}
              {imageUrl && (
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row gap-4 mb-2">
                    <button
                      onClick={handleShare}
                      disabled={!imageUrl}
                      className="px-10 py-4 bg-gray-200 text-black font-bold rounded-2xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Share Board
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!imageUrl}
                      className="px-10 py-4 bg-gray-200 text-black font-bold rounded-2xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                  </div>
                  {shareCaptionCopied && (
                    <p className="text-sm text-white/80 mt-2">
                      Caption copied to clipboard—paste it into your post or message if it didn&apos;t appear.
                    </p>
                  )}
                </div>
              )}

              {/* Create New Link */}
              <Link
                href="/create"
                className="text-white font-bold underline underline-offset-4 decoration-2 hover:text-gray-300"
              >
                Create a new vision board
              </Link>
            </div>

            {/* Right side - Vision Board Display */}
            <div className="w-1/2 flex items-center justify-center p-12 lg:p-20">
              {imageUrl ? (
                <div className="w-full max-w-2xl">
                  {/* Vision Board Image - All content (title, background, polaroids, logo) rendered by Lambda */}
                  <img
                    src={imageUrl}
                    alt="Vision Board"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : error ? (
                <div className="w-full max-w-2xl bg-white border border-red-200 shadow-2xl p-8 md:p-12 flex items-center justify-center rounded-lg">
                  <p className="text-red-700 text-center">{error}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

