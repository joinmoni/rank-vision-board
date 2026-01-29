"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BoardPage() {
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for image in sessionStorage (from local generation)
    const storedImage = sessionStorage.getItem("visionBoardImage");
    const storedGoals = sessionStorage.getItem("visionBoardGoals");

    if (storedImage) {
      setImageDataUrl(storedImage);
      if (storedGoals) {
        try {
          setGoals(JSON.parse(storedGoals));
        } catch (e) {
          console.error("Failed to parse stored goals:", e);
        }
      }
      setLoading(false);
      // Clear sessionStorage after reading
      sessionStorage.removeItem("visionBoardImage");
      sessionStorage.removeItem("visionBoardGoals");
    } else {
      // No image found, redirect to create page
      router.push("/create");
    }
  }, [router]);

  const handleDownload = async () => {
    if (!imageDataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
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
    }
  };

  const handleShare = async () => {
    if (!imageDataUrl) return;

    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'vision-board-2026.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "My 2026 Vision Board",
              text: `I used the Rank vision board app to create my 2026 vision board!`,
            });
            return;
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            return;
          }
        }
      }

      // Fallback: Copy to clipboard
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
      handleDownload();
    } catch (err: any) {
      console.error("Error sharing image:", err);
      alert(`Failed to share image: ${err?.message || "Unknown error"}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#FFF9F3] lg:bg-[#FAF5F0] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!imageDataUrl) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9F3] lg:bg-[#FAF5F0]">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="max-w-[450px] mx-auto px-6 pt-10 pb-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="https://rankvisionboard.framer.website/">
              <Image
                src="/rank-logo-black.svg"
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
            Your Vision Board
          </h1>

          {/* Description */}
          <p className="text-[18px] text-[#4A3F35] mb-8">
            Create a beautiful vision board to visualize your goals and dreams.
          </p>

          {/* Create New Button */}
          <Link
            href="/create"
            className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white transition-transform active:scale-[0.98] shadow-lg"
          >
            Create New Vision Board
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col min-h-screen">
        <div className="max-w-7xl mx-auto w-full px-12 py-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Link href="https://rankvisionboard.framer.website/">
              <Image
                src="/rank-logo-black.svg"
                alt="Rank Logo"
                width={120}
                height={35}
                priority
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Content: Text and Button */}
          <div className="flex flex-row gap-12 items-center min-h-[600px]">
            {/* Left side: Text and Button */}
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
              {imageDataUrl && (
                <div className="flex flex-row gap-4">
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
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
                    className="hidden lg:flex items-center justify-center gap-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
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
              )}
            </div>

            {/* Right side: Image */}
            {imageDataUrl && (
              <div className="w-1/2 flex justify-end">
                <div className="w-full max-w-2xl aspect-[1654/2339] bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative">
                  <img
                    src={imageDataUrl}
                    alt="Vision Board"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
