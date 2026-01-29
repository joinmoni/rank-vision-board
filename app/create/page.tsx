"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [goals, setGoals] = useState<string[]>(["", "", "", "", ""]);
  const [name, setName] = useState<string>("");
  const [rankTag, setRankTag] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [email, setEmail] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (value: string) => {
    if (!value) return true; // optional field - empty is valid
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };
  const nameValid = name.trim() !== "";
  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid;

  const MIN_GOALS = 5;
  const MAX_GOALS = 7;
  
  const addGoal = () => {
    if (goals.length >= MAX_GOALS) {
      return;
    }
    setGoals([...goals, ""]);
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  // Require at least 5 goals to generate
  const validGoalsCount = goals.filter((g) => g.trim() !== "").length;
  const canGenerate = validGoalsCount >= MIN_GOALS;
  const canSubmit = canGenerate && nameValid && !isGenerating; // Email is optional
  const canAddGoal = goals.length < MAX_GOALS && canGenerate;

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;
    if (!nameValid) {
      setError("Please enter your name.");
      return;
    }
    // Email is optional, but if provided, it should be valid
    if (email && !emailValid) {
      setEmailTouched(true);
      setError("Please enter a valid email address or leave it empty.");
      return;
    }

    const validGoals = goals.filter((goal) => goal.trim() !== "");
    
    if (validGoals.length < MIN_GOALS) {
      setError(`Please enter at least ${MIN_GOALS} goals`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          goals: validGoals, 
          email: email.trim() || undefined,
          name: name.trim() || undefined,
          rankTag: rankTag.trim() || undefined,
          gender: gender,
          uploadToStorage: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vision board job");
      }

      const data = await response.json();
      
      if (data.jobId) {
        router.push(`/board/${data.jobId}`);
      } else if (data.imageDataUrl) {
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
    <div className="bg-white text-black min-h-screen">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left side - Preview Image (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#3E0000] items-center justify-center p-12">
          <div className="relative max-w-md">
            <Image
              src="/image-14.png"
              alt="Vision Preview"
              width={800}
              height={1000}
              className="w-full h-auto object-contain"
              priority
              quality={100}
              unoptimized={false}
            />
          </div>
        </div>

        {/* Right side - Form */}
        <div className="lg:w-1/2 p-8 md:p-16 lg:p-20 overflow-y-auto max-h-screen custom-scroll">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Link href="https://rankvisionboard.framer.website/">
              <Image
                src="/rank-logo-black.svg"
                alt="Rank Logo"
                width={120}
                height={35}
                priority
                className="h-6 w-auto"
              />
            </Link>
          </div>

          <form className="space-y-6 max-w-lg" onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Gender</label>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                    gender === "male"
                      ? "bg-white shadow-sm"
                      : "text-gray-500 font-semibold"
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                    gender === "female"
                      ? "bg-white shadow-sm"
                      : "text-gray-500 font-semibold"
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
              />
            </div>

            {/* Rank Tag Input */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">
                Rank tag (Optional)
              </label>
              <input
                type="text"
                placeholder="@aadebola"
                value={rankTag}
                onChange={(e) => setRankTag(e.target.value)}
                className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">
                Your e-mail (Optional - So we can send your vision board once it's ready)
              </label>
              <input
                type="email"
                placeholder="johndoe@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={showEmailError ? "true" : "false"}
                className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-1 placeholder-gray-400 ${
                  showEmailError
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-200 focus:ring-gray-400"
                }`}
              />
              {showEmailError && (
                <p className="mt-2 text-sm text-red-600">Please enter a valid email address.</p>
              )}
            </div>

            {/* Goals Section */}
            <div className="pt-6">
              <h2 className="text-4xl font-extrabold mb-2 tracking-tight">Type in your Goals</h2>
              <p className="text-gray-600 mb-6">Minimum {MIN_GOALS} goals required (up to {MAX_GOALS}).</p>
              
              <div className="space-y-6">
                {goals.map((goal, index) => (
                  <div key={index}>
                    <label className="block text-sm font-semibold mb-2 text-gray-900">
                      Goal {index + 1}
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your goal name"
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
                    />
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addGoal}
                  disabled={!canAddGoal}
                  className={`w-full py-4 border border-dashed rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors ${
                    canAddGoal
                      ? "bg-gray-50 border-gray-300 text-[#3E0000] hover:bg-gray-100"
                      : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={goals.length >= MAX_GOALS ? `Maximum ${MAX_GOALS} goals allowed` : "Add another goal"}
                >
                  <span className="text-xl">+</span> Add your goals
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-5 rounded-full text-lg font-bold transition-opacity shadow-lg ${
                  canSubmit
                    ? "bg-[#3E0000] text-white hover:opacity-95 cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isGenerating ? "Generating..." : "Generate my Vision Board"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
