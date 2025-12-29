import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Rank - 2026 Vision Board",
  description: "Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.",
  icons: {
    icon: [
      { url: "/rank-icon.svg", type: "image/svg+xml" },
      { url: "/rank-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: "/rank-icon.svg",
  },
  openGraph: {
    title: "Rank - 2026 Vision Board",
    description: "Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.",
    type: "website",
    siteName: "Rank",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rank - 2026 Vision Board",
    description: "Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.",
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
