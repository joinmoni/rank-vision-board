"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function Home() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([
    "/image-11.gif",
    "/image-12.gif",
    "/image-13.gif",
    "/image-14.gif", // Center image
    "/image-15.gif",
    "/image-16.gif",
    // image-17.png excluded on mobile - will be added on desktop
  ]);

  // Detect mobile and filter images accordingly
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      if (isMobile) {
        // Mobile: exclude image-17.png
        setImages([
          "/image-11.gif",
          "/image-12.gif",
          "/image-13.gif",
          "/image-14.gif",
          "/image-15.gif",
          "/image-16.gif",
        ]);
      } else {
        // Desktop: include all images
        setImages([
          "/image-11.gif",
          "/image-12.gif",
          "/image-13.gif",
          "/image-14.gif",
          "/image-15.gif",
          "/image-16.gif",
          "/image-17.png",
        ]);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll to center on mobile mount (image-14)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isMobile = window.innerWidth < 1024;
      
      if (isMobile) {
        // Wait for images to load and layout to settle
        const timer = setTimeout(() => {
          const centerImage = container.querySelector('[data-image="image-14"]') as HTMLElement;
          if (centerImage) {
            // Calculate scroll position to center image-14
            const scrollLeft = centerImage.offsetLeft - (container.offsetWidth - centerImage.offsetWidth) / 2;
            container.scrollTo({ left: scrollLeft, behavior: "auto" });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [images]);

  return (
    <div className="min-h-screen bg-white text-black antialiased">
      <nav className="p-8 pb-4 lg:pb-6">
        <Link href="https://rankvisionboard.framer.website/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <Image
            src="/rank-logo-black.svg"
            alt="Rank Logo"
            width={120}
            height={35}
            priority
            className="h-6 w-auto"
          />
        </Link>
      </nav>

      <section className="relative overflow-hidden mt-2 lg:mt-1">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto overflow-y-hidden hide-scrollbar px-8 items-center h-[450px] snap-x snap-mandatory scroll-smooth lg:h-[550px]"
        >
          {images.map((src, index) => {
            const isCenter = src === "/image-14.gif";
            // Determine sizes: center image (index 3) is 400x500, others vary
            const sizes = isCenter
              ? { width: "400px", height: "500px" }
              : index === 2 || index === 4
              ? { width: "350px", height: "400px" }
              : { width: "300px", height: "400px" };

            return (
              <div
                key={src}
                data-image={src.replace("/", "").replace(".gif", "").replace(".png", "")}
                className={`bg-gray-100 rounded-sm overflow-hidden flex-shrink-0 snap-center ${
                  isCenter ? "border border-gray-100" : ""
                }`}
                style={{ minWidth: sizes.width, height: sizes.height }}
              >
                <img
                  src={src}
                  alt={`Vision board example ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={isCenter ? "eager" : "lazy"}
                />
              </div>
            );
          })}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-8 py-16 lg:py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-end">
          <div className="w-full">
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9]">
              Create your<br />2026 vision board
            </h1>
          </div>

          <div className="max-w-md lg:ml-auto">
            <p className="text-xl font-medium mb-10 leading-snug">
              Simply add your goals below. We will instantly transform them into a stunning image to keep you focused all year.
            </p>
            <Link
              href="/create"
              className="w-full py-6 bg-black text-white rounded-full text-lg font-bold hover:bg-gray-800 transition-colors inline-block text-center"
            >
              Add your goals
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
