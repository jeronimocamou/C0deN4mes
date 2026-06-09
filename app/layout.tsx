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
  title: "c0den4mes",
  description: "Real-time multiplayer Codenames — play with friends online, no account needed.",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'c0den4mes',
    description: 'Real-time multiplayer Codenames — play with friends online, no account needed.',
    url: 'https://c0den4mes.com',
    siteName: 'c0den4mes',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'c0den4mes',
    description: 'Real-time multiplayer Codenames — play with friends online, no account needed.',
  },
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
      <body className="min-h-full flex flex-col">
        {children}
        <span className="fixed bottom-2 right-3 font-mono text-[10px] text-zinc-700 select-none pointer-events-none">
          Jerome Corp. Enterprises™
        </span>
      </body>
    </html>
  );
}
