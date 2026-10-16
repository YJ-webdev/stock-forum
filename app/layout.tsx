// app/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  Figtree,
  IBM_Plex_Mono,
  Outfit,
  Plus_Jakarta_Sans,
  Red_Hat_Display,
} from "next/font/google";

import { Toaster } from "sonner";

import "@/app/globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "./components/theme-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-red-hat-display",
});

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const SITE_NAME = "BullBearVote";
const SITE_URL = "https://bullbearvote.com";

const SITE_TITLE = `${SITE_NAME} | Market Predictions & Community`;

const SITE_DESCRIPTION =
  "Bull or Bear? Predict the next session for global stock indices, track your watchlist, and discuss markets with the community.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  applicationName: SITE_NAME,

  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full font-sans antialiased",
        outfit.variable,
        figtree.variable,
        ibmPlexMono.variable,
        redHatDisplay.variable,
        jakartaSans.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>

          <Toaster
            position="bottom-center"
            duration={5000}
            className="left-1/2! right-auto! translate-none! transform-[translateX(-50%)]!"
            toastOptions={{
              classNames: {
                toast: cn(
                  "left-1/2! right-auto! -translate-x-1/2!",
                  "w-max! max-w-[calc(100vw-32px)]!",
                  "border-none! px-5! py-4! text-[15px]!",
                  "bg-zinc-900! text-white!",
                  "dark:bg-white! dark:text-zinc-950!",
                ),
                title: cn(
                  "min-w-0! text-[15px]! font-medium! text-inherit!",
                  "whitespace-normal! break-words!",
                  "sm:whitespace-nowrap!",
                ),
                description: cn(
                  "text-sm! whitespace-normal! break-words!",
                  "text-zinc-300! dark:text-zinc-600!",
                ),
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
