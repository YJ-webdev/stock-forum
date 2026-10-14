// app/(public)/help/page.tsx

import type { Metadata } from "next";

import { FooterPage } from "@/app/components/footer-page";

const TITLE = "Help";
const DESCRIPTION =
  "Learn how predictions, points, watchlists, and community discussions work on BullBearVote.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  alternates: {
    canonical: "/help",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/help",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },
};

export default function HelpPage() {
  return <FooterPage type="help" />;
}
