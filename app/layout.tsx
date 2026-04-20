import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "leaflet/dist/leaflet.css";
import "./globals.css";

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
      <html lang="en" className="h-full">
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
