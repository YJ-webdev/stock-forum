import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, Roboto_Mono } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./components/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "sonner";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
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
        geistSans.variable,
        geistMono.variable,
        figtree.variable,
        "font-sans",
        robotoMono.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
