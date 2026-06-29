import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalScene from "@/components/Scene/GlobalScene";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Specter — See the ghosts in your codebase",
  description: "AI-powered supply chain attack intelligence for developers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-screen w-screen overflow-hidden bg-void text-white">
        
        {/* GLOBAL CANVAS - Persists across all page navigations! 
            We use a separate Client Component wrapper to handle the 
            ssr: false dynamic import correctly. */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <GlobalScene />
        </div>

        {/* UI Layer - pointer-events-none allows clicks to pass through to the 3D scene behind */}
        <div className="relative z-10 h-full w-full pointer-events-none">
          <div className="pointer-events-auto h-full w-full">
            {children}
          </div>
        </div>
        
      </body>
    </html>
  );
}