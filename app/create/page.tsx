"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [goals, setGoals] = useState<string[]>(["", ""]);

  const addGoal = () => {
    setGoals([...goals, ""]);
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  // Check if first 2 goals are filled
  const canGenerate = goals[0]?.trim() !== "" && goals[1]?.trim() !== "";

  const handleGenerate = () => {
    if (canGenerate) {
      // Filter out empty goals and encode them in URL
      const validGoals = goals.filter((goal) => goal.trim() !== "");
      const goalsParam = encodeURIComponent(JSON.stringify(validGoals));
      router.push(`/board?goals=${goalsParam}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full overflow-x-hidden bg-[#FAF5F0]">
      {/* Left side - Collage */}
      <div className="w-full lg:w-1/2 order-2 lg:order-1 relative overflow-hidden bg-[#FAF5F0]">
        <div className="relative w-full h-[450px] lg:h-screen lg:min-h-[800px]">
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
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 order-1 lg:order-2 bg-white flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
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

        <div className="max-w-xl w-full">
          <h1 className="text-5xl lg:text-6xl font-[900] text-[#1A1310] leading-tight mb-8">
            Type In Your Goal
          </h1>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 mb-10 form-scroll">
            {goals.map((goal, index) => (
              <div key={index}>
                <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">
                  Goal {index + 1}
                </label>
                <input
                  type="text"
                  placeholder={
                    index === 0
                      ? "e.g. Run a marathon"
                      : index === 1
                      ? "e.g. Travel to Japan"
                      : ""
                  }
                  value={goal}
                  onChange={(e) => updateGoal(index, e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 focus:border-[#FF7A00] outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={addGoal}
              disabled={!canGenerate}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                canGenerate
                  ? "bg-[#FF7A00] hover:bg-[#E66D00] text-white active:scale-95"
                  : "bg-[#FFD6B0] text-white cursor-not-allowed"
              }`}
            >
              Add Goal
              <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm ${
                canGenerate
                  ? "bg-white text-[#FF7A00]"
                  : "bg-white/50 text-[#FF7A00]/50"
              }`}>
                ＋
              </span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${
                canGenerate
                  ? "bg-[#FF7A00] hover:bg-[#E66D00] text-white cursor-pointer active:scale-95"
                  : "bg-[#FFD6B0] text-white cursor-not-allowed"
              }`}
            >
              Generate Goal
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .form-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .form-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

