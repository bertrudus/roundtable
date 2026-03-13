import type { Metadata } from "next";
import { Inter, Bebas_Neue, Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Roundtable - AI Discussion Platform",
  description: "Watch AI agents debate topics around a virtual roundtable",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${bebasNeue.variable} ${cormorant.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-black antialiased">
        <div className="ambient-bg" />
        {children}
      </body>
    </html>
  );
}
