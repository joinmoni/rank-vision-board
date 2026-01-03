import Image from "next/image";
import Link from "next/link";

export default function Home() {
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

          {/* Vision Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-1.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-2.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-3.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-4.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-5.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-full overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-6.png"
                alt=""
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-row min-h-screen w-full overflow-hidden">
        {/* Left side - Circular Collage */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="relative w-full h-screen min-h-[800px]" style={{ position: 'relative' }}>
            <div className="vision-circle c-1 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[300px] h-[300px] aspect-square top-[-50px] left-[-100px] z-[5]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-1.png"
              />
            </div>
            <div className="vision-circle c-2 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[340px] h-[340px] aspect-square top-[-80px] left-[180px] z-[4]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-2.png"
              />
            </div>
            <div className="vision-circle c-3 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[220px] h-[220px] aspect-square top-[180px] left-[160px] z-[3]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-3.png"
              />
            </div>
            <div className="vision-circle c-4 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[380px] h-[380px] aspect-square top-[260px] left-[-120px] z-[6]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-4.png"
              />
            </div>
            <div className="vision-circle c-5 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[420px] h-[420px] aspect-square top-[280px] left-[220px] z-[2]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-5.png"
              />
            </div>
            <div className="vision-circle c-6 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[280px] h-[280px] aspect-square top-[540px] left-[100px] z-[7]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-6.png"
              />
            </div>
            <div className="vision-circle c-7 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[520px] h-[520px] aspect-square top-[620px] left-[320px] z-[1]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-7.png"
              />
            </div>
            <div className="vision-circle c-8 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[300px] h-[300px] aspect-square top-[620px] left-[-80px] z-[8]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-1.png"
              />
            </div>
            <div className="vision-circle c-9 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[400px] h-[400px] aspect-square top-[780px] left-[60px] z-[9]">
              <img
                alt=""
                loading="lazy"
                className="object-cover object-center w-full h-full"
                src="/image-2.png"
              />
            </div>
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
