"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [goals, setGoals] = useState<string[]>(["", ""]);
  const [email, setEmail] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;

    const validGoals = goals.filter((goal) => goal.trim() !== "");
    
    if (validGoals.length === 0) {
      setError("Please enter at least one goal");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use local generation if enabled, otherwise use Firebase Functions
      const generateRoute = process.env.NEXT_PUBLIC_USE_LOCAL_GENERATION === "true" 
        ? "/api/generate-local" 
        : "/api/generate";
      
      const response = await fetch(generateRoute, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          goals: validGoals, 
          email: email.trim() || undefined,
          uploadToStorage: true, // Upload to Supabase for local route too
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vision board job");
      }

      const data = await response.json();
      
      // Handle both job-based (Firebase/local with storage) and direct image responses
      if (data.jobId) {
        // Job-based flow: redirect to board page
        router.push(`/board/${data.jobId}`);
      } else if (data.imageDataUrl) {
        // Direct image flow: store in sessionStorage and redirect
        sessionStorage.setItem("visionBoardImage", data.imageDataUrl);
        sessionStorage.setItem("visionBoardGoals", JSON.stringify(validGoals));
        router.push("/board");
      } else {
        throw new Error("No job ID or image data returned");
      }
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create vision board. Please try again.");
      setIsGenerating(false);
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
            Type In Your Goal
          </h1>

          {/* Email Input (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">
              Email (So we can send you your vision board once it's ready)
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 focus:border-[#F97316] outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 mb-8 form-scroll">
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
                  className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 focus:border-[#F97316] outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 mb-12">
            <button
              onClick={addGoal}
              disabled={!canGenerate}
              className={`w-full py-[18px] rounded-[14px] text-[18px] font-bold flex items-center justify-center gap-2 transition-transform ${
                canGenerate
                  ? "bg-[#F97316] text-white active:scale-[0.98]"
                  : "bg-[#FFD6B0] text-white cursor-not-allowed"
              }`}
            >
              Add Goal
              <span
                className={`rounded-full w-6 h-6 flex items-center justify-center text-sm ${
                  canGenerate
                    ? "bg-white text-[#F97316]"
                    : "bg-white/50 text-[#F97316]/50"
                }`}
              >
                ＋
              </span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className={`w-full py-[18px] rounded-[14px] text-[18px] font-bold transition-transform ${
                canGenerate && !isGenerating
                  ? "bg-[#F97316] text-white cursor-pointer active:scale-[0.98]"
                  : "bg-[#FFD6B0] text-white cursor-not-allowed"
              }`}
            >
              {isGenerating ? "Creating board.." : "Generate Board"}
            </button>
          </div>

          {/* Vision Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-1.png"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden row-span-2 aspect-[1/2] shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-2.png"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-3.png"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden col-span-2 aspect-[2/1] shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-4.png"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] -rotate-1">
              <img
                src="/image-5.png"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative bg-[#E5E5E5] rounded-2xl overflow-hidden aspect-square shadow-[0_4px_20px_rgba(0,0,0,0.06)] rotate-1">
              <img
                src="/image-6.png"
                alt=""
                className="w-full h-full object-cover"
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
          <div
            className="relative w-full h-screen min-h-[800px]"
            style={{ position: "relative" }}
          >
            <div className="vision-circle c-1 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[300px] h-[300px] top-[-50px] left-[-100px] z-[5]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-1.png"
              />
            </div>
            <div className="vision-circle c-2 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[340px] h-[340px] top-[-80px] left-[180px] z-[4]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-2.png"
              />
            </div>
            <div className="vision-circle c-3 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[220px] h-[220px] top-[180px] left-[160px] z-[3]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-3.png"
              />
            </div>
            <div className="vision-circle c-4 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[380px] h-[380px] top-[260px] left-[-120px] z-[6]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-4.png"
              />
            </div>
            <div className="vision-circle c-5 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[420px] h-[420px] top-[280px] left-[220px] z-[2]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-5.png"
              />
            </div>
            <div className="vision-circle c-6 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[280px] h-[280px] top-[540px] left-[100px] z-[7]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-6.png"
              />
            </div>
            <div className="vision-circle c-7 absolute rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-[520px] h-[520px] top-[620px] left-[320px] z-[1]">
              <img
                alt=""
                loading="lazy"
                className="object-cover"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                }}
                src="/image-7.png"
              />
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-1/2 bg-white flex flex-col justify-center px-24">
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
            <h1 className="text-6xl font-[900] text-[#1A1310] leading-tight mb-8">
              Type In Your Goal
            </h1>

                    {/* Email Input (Optional) */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">
                        Email (so we can send you your vision board)
                      </label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 focus:border-[#FF7A00] outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

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

            <div className="flex flex-row gap-4">
              <button
                onClick={addGoal}
                disabled={!canGenerate}
                className={`flex-1 py-4 px-8 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  canGenerate
                    ? "bg-[#FF7A00] hover:bg-[#E66D00] text-white active:scale-95"
                    : "bg-[#FFD6B0] text-white cursor-not-allowed"
                }`}
              >
                Add Goal
                <span
                  className={`rounded-full w-6 h-6 flex items-center justify-center text-sm ${
                    canGenerate
                      ? "bg-white text-[#FF7A00]"
                      : "bg-white/50 text-[#FF7A00]/50"
                  }`}
                >
                  ＋
                </span>
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className={`flex-1 py-4 px-8 rounded-2xl font-bold text-lg transition-all ${
                  canGenerate && !isGenerating
                    ? "bg-[#FF7A00] hover:bg-[#E66D00] text-white cursor-pointer active:scale-95"
                    : "bg-[#FFD6B0] text-white cursor-not-allowed"
                }`}
              >
                {isGenerating ? "Creating Board..." : "Generate Board"}
              </button>
            </div>
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

