import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF5F0]">
      <div className="flex flex-col lg:flex-row min-h-screen w-full overflow-hidden">
        {/* Left side - Circular Collage */}
        <div className="w-full lg:w-1/2 order-2 lg:order-1 relative">
          <div className="collage-wrapper relative w-full h-[500px] lg:h-screen lg:min-h-[800px]">
            <div className="vision-circle c-1 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[35%] aspect-square top-[5%] left-[-5%] z-[5] lg:w-[300px] lg:h-[300px] lg:top-[-50px] lg:left-[-100px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-1.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 35vw, 300px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-2 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[32%] aspect-square top-0 left-[30%] z-[4] lg:w-[340px] lg:h-[340px] lg:top-[-80px] lg:left-[180px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-2.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 32vw, 340px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-3 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[28%] aspect-square top-[25%] left-[35%] z-[3] lg:w-[220px] lg:h-[220px] lg:top-[180px] lg:left-[160px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-3.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 28vw, 220px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-4 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[40%] aspect-square top-[40%] left-[-10%] z-[6] lg:w-[380px] lg:h-[380px] lg:top-[260px] lg:left-[-120px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-4.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 40vw, 380px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-5 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[35%] aspect-square top-[45%] left-[60%] z-[2] lg:w-[420px] lg:h-[420px] lg:top-[280px] lg:left-[220px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-5.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 35vw, 420px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-6 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[28%] aspect-square top-[58%] left-[32%] z-[7] lg:w-[280px] lg:h-[280px] lg:top-[540px] lg:left-[100px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-6.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 28vw, 280px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-7 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[45%] aspect-square top-[65%] left-[55%] z-[1] lg:w-[520px] lg:h-[520px] lg:top-[620px] lg:left-[320px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-7.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 45vw, 520px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-8 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[30%] aspect-square top-[72%] left-[-5%] z-[8] lg:w-[300px] lg:h-[300px] lg:top-[620px] lg:left-[-80px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-1.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 30vw, 300px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
            <div className="vision-circle c-9 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[38%] aspect-square top-[82%] left-[20%] z-[9] lg:w-[400px] lg:h-[400px] lg:top-[780px] lg:left-[60px]">
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                <Image src="/image-2.png" alt="" fill className="object-cover" sizes="(max-width: 1023px) 38vw, 400px" style={{ clipPath: 'circle(50%)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="w-full lg:w-1/2 order-1 lg:order-2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left px-6 lg:px-16 py-12 lg:py-0">
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
            <h1 className="text-[44px] lg:text-[72px] font-[900] text-[#1A1310] leading-[1.05] mb-6">
              Create Your <br className="hidden lg:block" /> 2026 Vision Board
            </h1>

            <p className="text-[#4A4441] text-lg lg:text-xl font-medium leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
              Simply type in your goals below. We will instantly transform them
              into a stunning image to keep you focused all year.
            </p>

            <Link
              href="/create"
              className="bg-[#FF7A00] hover:bg-[#E66D00] text-white w-full lg:w-auto px-14 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 inline-block text-center"
            >
              Add your goals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
