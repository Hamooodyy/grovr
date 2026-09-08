import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grovr",
  description: "Your grocery companion — know what you have, know what to cook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`h-full ${raleway.variable}`}>
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
