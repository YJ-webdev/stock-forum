// app/(public)/feedback/page.tsx

import type { Metadata } from "next";

import { FooterPage } from "@/app/components/footer-page";

const TITLE = "Feedback";
const DESCRIPTION =
  "Share suggestions, report issues, and help improve BullBearVote.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  alternates: {
    canonical: "/feedback",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/feedback",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },

  twitter: {
    card: "summary",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },
};

export default function FeedbackPage() {
  return <FooterPage type="feedback" />;
}
