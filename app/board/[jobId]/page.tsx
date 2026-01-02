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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const collageRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
              text: `I used the Rank vision board app to create my 2026 vision board! Check it out here: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://rank-vision-board.vercel.app'}`,
            });
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
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9F3] lg:bg-[#FAF5F0]">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="max-w-[450px] mx-auto px-6 pt-10 pb-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/">
              <Image
                src="/rank-logo.svg"
                alt="Rank Logo"
                width={120}
                height={35}
                priority
                className="h-[22px] w-auto"
              />
            </Link>
          </div>

          {/* Heading (during loading) */}
          {loading && (
            <h1 className="text-[52px] font-[900] text-[#1A1A1A] leading-[0.95] tracking-[-2px] mb-6">
              Creating your 2026 Vision Board....
            </h1>
          )}

          {/* Loading State */}
          {loading && (
            <div className="w-full flex justify-center mb-8">
              <div className="w-full aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-8">
                <p className="text-gray-500 font-medium text-center mb-6">
                  Loading Vision board. Give us a min.....
                </p>
                <div className="w-full max-w-[300px]">
                  <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-[#F97316] h-full rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm text-center mt-2">
                    {Math.round(progress)}%
                  </p>
                </div>
                {jobStatus === "pending" && (
                  <p className="text-sm text-gray-600 mt-4 text-center">
                    Your job has been created. We'll email you when it's ready!
                  </p>
                )}
                {jobStatus === "processing" && (
                  <p className="text-xs text-gray-500 mt-4 text-center max-w-[280px] mx-auto">
                    Feel free to navigate away from this page. We'll notify you via email when it's ready, or you can come back to this page later.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="w-full flex justify-center mb-8">
              <div className="w-full aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center">
                <p className="text-red-500 font-medium text-center px-4">{error}</p>
              </div>
            </div>
          )}

          {/* Heading */}
          {!loading && (
            <h1 className="text-[52px] font-[900] text-[#1A1A1A] leading-[0.95] tracking-[-2px] mb-6">
              Your 2026 Vision Board Is Complete
            </h1>
          )}

          {/* Description */}
          {!loading && (
            <p className="text-[18px] text-[#4A3F35] mb-8">
              Take a moment to pause, reflect, and see your goals come to life.
            </p>
          )}

          {/* Image Display */}
          {imageUrl && !loading && (
            <>
              <div className="mb-8 w-full flex justify-center">
                <div
                  ref={collageRef}
                  className="w-full aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative board-result"
                >
                  <img
                    src={imageUrl}
                    alt="Vision Board"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-4 mt-8">
                <button
                  onClick={handleShare}
                  disabled={loading || !imageUrl}
                  className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white transition-transform active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Share Board
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={loading || !imageUrl}
                  className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white transition-transform active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download Board
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Desktop Layout - similar structure */}
      <div className="hidden lg:flex flex-col min-h-screen">
        <div className="max-w-7xl mx-auto w-full px-12 py-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Link href="/">
              <Image
                src="/rank-logo.svg"
                alt="Rank Logo"
                width={120}
                height={35}
                priority
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Loading State - 2 Column Layout */}
          {loading && (
            <div className="flex flex-row gap-12 items-center min-h-[600px]">
              {/* Left side: Text */}
              <div className="w-1/2 flex flex-col pr-8">
                <h1 className="text-[52px] font-[900] text-[#1A1A1A] leading-[0.95] tracking-[-2px] mb-6">
                  Creating your 2026 Vision Board....
                </h1>
                {jobStatus === "pending" && (
                  <p className="text-[18px] text-[#4A3F35] mb-8">
                    Your job has been created. We'll email you when it's ready!
                  </p>
                )}
                {jobStatus === "processing" && (
                  <p className="text-base text-gray-500">
                    Feel free to navigate away from this page. We'll notify you via email when it's ready, or you can come back to this page later.
                  </p>
                )}
              </div>

              {/* Right side: Loading Indicator */}
              <div className="w-1/2 flex justify-end">
                <div className="w-full max-w-2xl aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-8">
                  <p className="text-gray-500 font-medium text-center mb-6">
                    Loading Vision board. Give us a min.....
                  </p>
                  <div className="w-full max-w-[300px]">
                    <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#F97316] h-full rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-gray-400 text-sm text-center mt-2">
                      {Math.round(progress)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="w-full flex justify-center mb-8">
              <div className="w-full max-w-2xl aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center">
                <p className="text-red-500 font-medium text-center px-4">{error}</p>
              </div>
            </div>
          )}

          {/* Content: Text/Buttons on left, Image on right */}
          {!loading && imageUrl && (
            <div className="flex flex-row gap-12 items-center min-h-[600px]">
              {/* Left side: Text and Buttons */}
              <div className="w-1/2 flex flex-col pr-8">
                {/* Heading */}
                <h1 className="text-[52px] font-[900] text-[#1A1A1A] leading-[0.95] tracking-[-2px] mb-6">
                  Your 2026 Vision Board Is Complete
                </h1>

                {/* Description */}
                <p className="text-[18px] text-[#4A3F35] mb-8">
                  Take a moment to pause, reflect, and see your goals come to life.
                </p>

                {/* Buttons */}
                <div className="flex flex-row gap-4">
                  <button
                    onClick={handleShare}
                    disabled={loading || !imageUrl}
                    className="flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Share Board
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={loading || !imageUrl}
                    className="flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download Board
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right side: Image */}
              <div className="w-1/2 flex justify-end">
                <div
                  ref={collageRef}
                  className="w-full max-w-full aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative board-result"
                >
                  <img
                    src={imageUrl}
                    alt="Vision Board"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

