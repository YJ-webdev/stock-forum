// app/(public)/disclaimer/page.tsx

import type { Metadata } from "next";

import { FooterPage } from "@/app/components/footer-page";

const TITLE = "Disclaimer";
const DESCRIPTION =
  "Read BullBearVote’s disclaimer about market information, community content, and predictions.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  alternates: {
    canonical: "/disclaimer",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/disclaimer",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },
};

export default function DisclaimerPage() {
  return <FooterPage type="disclaimer" />;
}
