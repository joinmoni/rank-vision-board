"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";

interface VisionBoardData {
  imageUrl: string;
  goals: string[];
}

export default function BoardPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const collageRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate API calls (React Strict Mode in dev causes double renders)
    if (hasFetchedRef.current) {
      return;
    }

    // Get goals from URL params
    const params = new URLSearchParams(window.location.search);
    const goalsParam = params.get("goals");

    if (!goalsParam) {
      setError("No goals provided");
      setLoading(false);
      return;
    }

    try {
      const goalsList = JSON.parse(decodeURIComponent(goalsParam));
      // Set goals immediately so they can be displayed right away
      setGoals(goalsList);
      hasFetchedRef.current = true; // Mark as fetched before calling
      fetchImage(goalsList);
    } catch (err) {
      setError("Invalid goals parameter");
      setLoading(false);
    }
  }, []);

  // Progress bar effect (90 seconds, capped at 99% until image loads)
  useEffect(() => {
    if (!loading) {
      // When loading completes, set to 100% briefly then reset
      setProgress(100);
      setTimeout(() => setProgress(0), 100);
      return;
    }

    const totalTime = 90; // 90 seconds
    const interval = 100; // Update every 100ms for smooth animation
    const increment = 99 / (totalTime * 10); // Increment per 100ms to reach 99% in 90s (not 100%)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) {
          return 99; // Cap at 99% while loading
        }
        return Math.min(prev + increment, 99);
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [loading]);

  const fetchImage = async (goalsList: string[]) => {
    // Prevent duplicate calls - if we already have an image or are currently loading, don't fetch again
    if (imageUrl || (!loading && hasFetchedRef.current)) {
      return;
    }

    try {
      console.log("Fetching image for goals:", goalsList);
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goals: goalsList }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate vision board");
      }

      const data: VisionBoardData = await response.json();
      setImageUrl(data.imageUrl);
      setGoals(data.goals);
      setLoading(false);
    } catch (err) {
      console.error("Error generating vision board:", err);
      setError("Failed to generate vision board. Please try again.");
      setLoading(false);
      hasFetchedRef.current = false; // Reset on error to allow retry
    }
  };

  const getCollageElement = () => {
    // Try to get from ref first (mobile version)
    if (collageRef.current) return collageRef.current;
    // Fallback: find by class (works for both mobile and desktop)
    return document.querySelector('.board-result') as HTMLElement;
  };

  const handleDownload = async () => {
    const collageElement = getCollageElement();
    if (!collageElement) return;

    try {
      const canvas = await html2canvas(collageElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = "vision-board-2026.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error generating download:", err);
      alert("Failed to download image. Please try again.");
    }
  };

  const handleShare = async () => {
    const collageElement = getCollageElement();
    if (!collageElement) return;

    try {
      const canvas = await html2canvas(collageElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, "image/png");
      });

      if (navigator.share) {
        try {
          const file = new File([blob], "vision-board-2026.png", {
            type: "image/png",
          });
          await navigator.share({
            title: "My 2026 Vision Board",
            files: [file],
          });
        } catch (err) {
          // If share fails, fallback to download
          handleDownload();
        }
      } else {
        // Fallback: copy to clipboard or download
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          alert("Image copied to clipboard!");
        } catch (err) {
          // If clipboard fails, fallback to download
          handleDownload();
        }
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Fallback to download
      handleDownload();
    }
  };


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

          {/* Heading */}
          <h1 className="text-[52px] font-[900] text-[#1A1A1A] leading-[0.95] tracking-[-2px] mb-6">
            {loading ? "Creating your 2026 Vision Board...." : "Your 2026 Vision Board Is Complete"}
          </h1>

          {/* Description */}
          <p className="text-[18px] text-[#4A3F35] mb-8">
            Take a moment to pause, reflect, and see your goals come to life.
          </p>

          {/* Vision Board */}
          <div className="w-full flex justify-center relative mb-8">
            {loading ? (
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
              </div>
            ) : error ? (
              <div className="w-full aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center">
                <p className="text-red-500 font-medium text-center px-4">{error}</p>
              </div>
            ) : (
              <div
                ref={collageRef}
                className="board-result w-full aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden"
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Vision Board"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 mb-6">
            <button
              onClick={handleShare}
              disabled={loading || !imageUrl}
              className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#F97316] text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share Goal
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
              className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#F97316] text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download Goal
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

          {/* Create New Link */}
          <Link
            href="/create"
            className="text-[#F97316] hover:text-[#E66D00] font-medium text-lg transition-colors underline underline-offset-4 text-center block"
          >
            Create a new vision board
          </Link>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-center p-6 min-h-screen">
        <div className="max-w-7xl w-full mx-auto flex flex-row items-center justify-between gap-24">
          {/* Left side - Content */}
          <div className="w-1/2 flex flex-col items-start text-left">
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

            <h1 className="text-7xl font-[900] text-[#1A1310] leading-tight mb-6">
              {loading ? "Creating your 2026 Vision Board...." : "Your 2026 Vision Board Is Complete"}
            </h1>

            <p className="text-[#6D6865] text-xl font-medium leading-relaxed mb-10 max-w-md">
              Take a moment to pause, reflect, and see your goals come to life.
            </p>

            <div className="flex flex-row gap-4 mb-6">
              <button
                onClick={handleShare}
                disabled={loading || !imageUrl}
                className="flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Share Goal
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
                Download Goal
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

            <Link
              href="/create"
              className="text-[#FF7A00] hover:text-[#E66D00] font-medium text-lg transition-colors underline underline-offset-4"
            >
              Create a new vision board
            </Link>
          </div>

          {/* Vision Board - Desktop only (right side) */}
          <div className="w-1/2 flex justify-center relative">
            {loading ? (
              <div className="w-full max-w-[600px] aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-12">
                <p className="text-gray-500 font-medium text-center mb-8 text-lg">
                  Loading Vision board. Give us a min.....
                </p>
                <div className="w-full max-w-[400px]">
                  <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-[#FF7A00] h-full rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm text-center mt-3">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="w-full max-w-[600px] aspect-square bg-gray-200 rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center">
                <p className="text-red-500 font-medium text-center px-4">{error}</p>
              </div>
            ) : (
              <div
                className="board-result w-full max-w-[600px] aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden"
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Vision Board"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
