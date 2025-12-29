import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rank - Your Goals",
  description: "Type in your goals to create your vision board",
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

