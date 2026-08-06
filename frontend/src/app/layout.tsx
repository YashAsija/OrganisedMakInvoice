import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mobile Invoice & Bill Maker",
  description: "Generate high-performance estimates, automate repeating client invoice cycles.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Sacramento&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Alex+Brush&family=Parisienne&family=Yellowtail&family=Mrs+Saint+Delafield&family=Reenie+Beanie&family=Herr+Von+Muellerhoff&family=Monsieur+La+Doulaise&family=Pinyon+Script&family=Zeyada&family=Mr+De+Haviland&family=La+Belle+Aurore&family=Allura&family=Arizonia&family=Clicker+Script&family=Kristi&family=Marck+Script&family=Meie+Script&family=Ruthie&family=Seaweed+Script&family=Tangerine&family=WindSong&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
