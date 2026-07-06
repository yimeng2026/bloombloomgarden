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
  title: "BloomBloomGarden - AI Agent & 学术研究平台",
  description: "创建和管理你的 AI Agent，开启智能对话与学术研究",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="/tailwind.css" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
