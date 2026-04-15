import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Re:connect",
  description:
    "A game for reconnecting with old friends. Share life updates, guess what's real, and see how well you really know each other.",
};

// Deterministic star positions (avoids hydration mismatch)
const STARS = [
  { x: 8, y: 12, size: 2, duration: 3.2, delay: 0.0, opacity: 0.35 },
  { x: 15, y: 78, size: 1.5, duration: 4.8, delay: 0.7, opacity: 0.25 },
  { x: 23, y: 35, size: 2.5, duration: 3.8, delay: 1.2, opacity: 0.40 },
  { x: 31, y: 90, size: 1.5, duration: 5.1, delay: 0.3, opacity: 0.20 },
  { x: 42, y: 18, size: 2, duration: 4.2, delay: 1.8, opacity: 0.30 },
  { x: 55, y: 62, size: 1.5, duration: 3.5, delay: 0.9, opacity: 0.25 },
  { x: 63, y: 8, size: 3, duration: 4.6, delay: 2.1, opacity: 0.35 },
  { x: 70, y: 45, size: 1.5, duration: 3.9, delay: 0.5, opacity: 0.20 },
  { x: 78, y: 82, size: 2, duration: 4.4, delay: 1.5, opacity: 0.30 },
  { x: 85, y: 25, size: 2.5, duration: 3.7, delay: 2.4, opacity: 0.40 },
  { x: 92, y: 68, size: 1.5, duration: 5.2, delay: 0.8, opacity: 0.25 },
  { x: 97, y: 14, size: 2, duration: 4.0, delay: 1.1, opacity: 0.35 },
  { x: 5, y: 55, size: 1.5, duration: 3.6, delay: 2.7, opacity: 0.20 },
  { x: 48, y: 95, size: 2, duration: 4.9, delay: 0.4, opacity: 0.30 },
  { x: 20, y: 5, size: 1.5, duration: 3.3, delay: 1.9, opacity: 0.25 },
  { x: 88, y: 50, size: 2.5, duration: 4.7, delay: 0.6, opacity: 0.35 },
  { x: 35, y: 72, size: 1.5, duration: 5.0, delay: 2.2, opacity: 0.20 },
  { x: 60, y: 30, size: 2, duration: 3.4, delay: 1.4, opacity: 0.30 },
  { x: 12, y: 42, size: 1.5, duration: 4.1, delay: 2.8, opacity: 0.25 },
  { x: 75, y: 88, size: 2, duration: 3.8, delay: 0.2, opacity: 0.35 },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Warm glow at top */}
        <div className="glow-top" aria-hidden="true" />

        {/* Twinkling stars */}
        <div className="stars-layer" aria-hidden="true">
          {STARS.map((s, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                "--duration": `${s.duration}s`,
                "--delay": `${s.delay}s`,
                "--max-opacity": s.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {children}
      </body>
    </html>
  );
}
