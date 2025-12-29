import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rank - Vision Board Complete",
  description: "Your 2026 vision board is complete",
};

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

