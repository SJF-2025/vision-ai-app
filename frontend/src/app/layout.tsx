import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@carbon/styles/css/styles.css";
import AppHeader from "../components/AppHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SJF X IBM VisionAI",
  description: "Carbon + Next demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
