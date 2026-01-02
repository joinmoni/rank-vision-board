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
    if (collageRef.current) {
      console.log("Using ref element");
      return collageRef.current;
    }
    // Fallback: find by class (works for both mobile and desktop)
    const element = document.querySelector('.board-result') as HTMLElement;
    console.log("Using querySelector element:", element);
    return element;
  };

  const handleDownload = async () => {
    if (!imageUrl) {
      alert("No image available to download. Please wait for the vision board to be generated.");
      return;
    }

    try {
      // Load the main image
      const mainImage = document.createElement('img');
      mainImage.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        mainImage.onload = resolve;
        mainImage.onerror = reject;
        mainImage.src = imageUrl;
      });

      // Load the logo image
      const logoImage = document.createElement('img');
      logoImage.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        logoImage.onload = resolve;
        logoImage.onerror = resolve; // Continue even if logo fails
        logoImage.src = '/rank-logo.svg';
      });

      // Create canvas - make it square using the smaller dimension
      const size = Math.min(mainImage.width, mainImage.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw main image centered and cropped to square
      const offsetX = (mainImage.width - size) / 2;
      const offsetY = (mainImage.height - size) / 2;
      ctx.drawImage(mainImage, offsetX, offsetY, size, size, 0, 0, size, size);

      // Draw logo in top left corner (white color)
      if (logoImage.complete && logoImage.naturalWidth > 0) {
        const logoSize = size * 0.1; // 10% of canvas size
        const logoX = size * 0.04; // 4% padding from left
        const logoY = size * 0.04; // 4% padding from top
        
        // Apply white color filter by drawing logo with composite operation
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'brightness(0) invert(1)';
        ctx.drawImage(logoImage, logoX, logoY, logoSize, (logoSize * logoImage.height / logoImage.width));
        ctx.filter = 'none';
      }

      // Convert canvas to data URL
      const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      
      // Create download link
      const element = document.createElement('a');
      const filename = 'vision-board-2026.png';
      element.setAttribute('href', image);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      // Also try Web Share API for mobile
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], filename, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: "My 2026 Vision Board built with Rank",
              });
            }
          } catch (err) {
            // Share failed or cancelled, that's okay
          }
        }
      }, "image/png");
    } catch (err: any) {
      console.error("Error generating download:", err);
      alert(`Failed to download image: ${err?.message || "Unknown error"}. Please try again.`);
    }
  };

  const handleShare = async () => {
    if (!imageUrl) {
      alert("No image available to share. Please wait for the vision board to be generated.");
      return;
    }

    try {
      // Load the main image
      const mainImage = document.createElement('img');
      mainImage.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        mainImage.onload = resolve;
        mainImage.onerror = reject;
        mainImage.src = imageUrl;
      });

      // Load the logo image
      const logoImage = document.createElement('img');
      logoImage.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        logoImage.onload = resolve;
        logoImage.onerror = resolve; // Continue even if logo fails
        logoImage.src = '/rank-logo.svg';
      });

      // Create canvas - make it square using the smaller dimension
      const size = Math.min(mainImage.width, mainImage.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw main image centered and cropped to square
      const offsetX = (mainImage.width - size) / 2;
      const offsetY = (mainImage.height - size) / 2;
      ctx.drawImage(mainImage, offsetX, offsetY, size, size, 0, 0, size, size);

      // Draw logo in top left corner (white color)
      if (logoImage.complete && logoImage.naturalWidth > 0) {
        const logoSize = size * 0.1; // 10% of canvas size
        const logoHeight = logoSize * logoImage.height / logoImage.width;
        const logoX = size * 0.04; // 4% padding from left
        const logoY = size * 0.04; // 4% padding from top
        
        // Create temporary canvas to apply white filter
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = logoSize;
        tempCanvas.height = logoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw logo to temporary canvas
          tempCtx.drawImage(logoImage, 0, 0, logoSize, logoHeight);
          
          // Get image data and convert to white
          const imageData = tempCtx.getImageData(0, 0, logoSize, logoHeight);
          const data = imageData.data;
          
          // Convert all non-transparent pixels to white
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // If pixel is not transparent
              data[i] = 255;     // R
              data[i + 1] = 255; // G
              data[i + 2] = 255; // B
              // Keep alpha channel (data[i + 3])
            }
          }
          
          tempCtx.putImageData(imageData, 0, 0);
          
          // Draw the white logo to main canvas
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(tempCanvas, logoX, logoY);
        }
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });

      if (!blob) {
        throw new Error("Failed to create image blob");
      }

      const filename = 'vision-board-2026.png';

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "",
              text: `I used the Rank vision board app to create my 2026 vision board! Check it out here: ${process.env.NEXT_PUBLIC_SITE_URL}`,
            });
            return; // Successfully shared
          }
        } catch (err: any) {
          // User cancelled or share failed
          if (err.name === "AbortError") {
            return; // User cancelled, don't try other methods
          }
          // Otherwise fall through to clipboard
        }
      }

      // Fallback: Try Clipboard API (desktop)
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          alert("Image copied to clipboard! You can paste it anywhere.");
          return; // Successfully copied
        } catch (err) {
          // Clipboard failed, fall through to download
          console.log("Clipboard API not supported or failed:", err);
        }
      }

      // Final fallback: Download
      const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      const element = document.createElement('a');
      element.setAttribute('href', image);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
    } catch (err: any) {
      console.error("Error sharing:", err);
      alert(`Failed to share image: ${err?.message || "Unknown error"}. Please try downloading instead.`);
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
                className="board-result w-full aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative"
              >
                {imageUrl && (
                  <>
                    <img
                      src={imageUrl}
                      alt="Vision Board"
                      className="w-full h-full object-cover"
                    />
                    {/* Rank Logo in bottom right */}
                    <div className="absolute bottom-4 right-4 z-10">
                      <img
                        src="/rank-logo.svg"
                        alt="Rank Logo"
                        className="h-6 w-auto opacity-90"
                        style={{ 
                          width: 'auto', 
                          height: '24px',
                          filter: 'brightness(0) invert(1)'
                        }}
                      />
                    </div>
                  </>
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
              className="w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-3 bg-[#F97316] text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="board-result w-full max-w-[600px] aspect-square bg-white rounded-2xl border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative"
              >
                {imageUrl && (
                  <>
                    <img
                      src={imageUrl}
                      alt="Vision Board"
                      className="w-full h-full object-cover"
                    />
                    {/* Rank Logo in bottom right */}
                    <div className="absolute bottom-4 right-4 z-10">
                      <img
                        src="/rank-logo.svg"
                        alt="Rank Logo"
                        className="h-6 w-auto opacity-90"
                        style={{ 
                          width: 'auto', 
                          height: '24px',
                          filter: 'brightness(0) invert(1)'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
