import type { Metadata } from "next";
import "./globals.css";
import "@carbon/styles/css/styles.css";
import AppHeader from "../components/AppHeader";

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
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
