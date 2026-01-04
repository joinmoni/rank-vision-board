import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF7EF]">
      {/* Mobile Layout */}
      <div className="lg:hidden h-screen overflow-y-hidden overflow-x-hidden">
        <div className="max-w-[450px] mx-auto px-6 pt-10 pb-0 h-full flex flex-col relative">
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
            Create Your 2026 Vision Board
          </h1>

          {/* Description */}
          <p className="text-[18px] text-[#4A3F35] mb-8 max-w-[90%]">
            Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.
          </p>

          {/* CTA Button */}
          <Link
            href="/create"
            className="bg-[#F97316] text-white w-full py-[18px] rounded-[14px] text-[18px] font-bold text-center block mb-12 transition-transform active:scale-[0.98]"
          >
            Add your goals
          </Link>

          {/* Vision Collage - Bleeds out bottom and sides */}
          <div className="w-full flex-1 relative min-h-0 overflow-visible">
            <div className="absolute top-0 inset-x-[-24px] h-[calc(100%+48px)]">
              <img
                src="/vision-collage-mobile.png"
                alt="Vision board collage"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-row min-h-screen w-full overflow-hidden">
        {/* Left side - Collage */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="relative w-full h-screen min-h-[800px] flex items-center justify-center">
            <img
              src="/vision-collage.png"
              alt="Vision board collage"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right side - Content */}
        <div className="w-1/2 flex flex-col justify-center items-start text-left px-16">
          <div className="flex items-center gap-2 mb-8">
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

          <div className="max-w-xl">
            <h1 className="text-[72px] font-[900] text-[#1A1310] leading-[1.05] mb-6">
              Create Your 2026 Vision Board
            </h1>

            <p className="text-[#4A4441] text-xl font-medium leading-relaxed mb-10 max-w-md">
              Simply type in your goals below. We will instantly transform them
              into a stunning image to keep you focused all year.
            </p>

            <Link
              href="/create"
              className="bg-[#FF7A00] hover:bg-[#E66D00] text-white w-auto px-14 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 inline-block text-center"
          >
              Add your goals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
