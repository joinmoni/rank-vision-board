import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rank - 2026 Vision Board",
  description: "Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.",
  icons: {
    icon: "/rank-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
