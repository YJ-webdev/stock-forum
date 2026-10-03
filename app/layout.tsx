import type { Metadata } from "next";
import {
  Figtree,
  Red_Hat_Display,
  Plus_Jakarta_Sans,
  IBM_Plex_Mono,
  Outfit,
} from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});
const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-red-hat-display",
  weight: ["400", "500", "600", "700", "800"],
});

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Financial Market Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        outfit.variable,
        figtree.variable,
        "font-sans",
        ibmPlexMono.variable,
        redHatDisplay.variable,
        jakartaSans.variable,
      )}
      suppressHydrationWarning
    >
      <body
        className={`${redHatDisplay.variable} min-h-full flex flex-col bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>

          <Toaster
            position="bottom-center"
            theme="dark"
            duration={5000}
            toastOptions={{
              classNames: {
                toast: " border-none! px-5! py-4! text-[15px]!",
                title: "text-[15px]! font-medium! ",
                description: "text-sm! ",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
