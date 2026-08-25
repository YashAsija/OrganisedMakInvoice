import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

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

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} ${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Sacramento&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Alex+Brush&family=Parisienne&family=Yellowtail&family=Mrs+Saint+Delafield&family=Reenie+Beanie&family=Herr+Von+Muellerhoff&family=Monsieur+La+Doulaise&family=Pinyon+Script&family=Zeyada&family=Mr+De+Haviland&family=La+Belle+Aurore&family=Allura&family=Arizonia&family=Clicker+Script&family=Kristi&family=Marck+Script&family=Meie+Script&family=Ruthie&family=Seaweed+Script&family=Tangerine&family=WindSong&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
