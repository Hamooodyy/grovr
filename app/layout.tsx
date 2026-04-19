import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grovr",
  description: "Find the cheapest grocery prices near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${syne.variable} h-full`}>
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
