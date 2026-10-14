// app/(public)/privacy-terms/page.tsx

import type { Metadata } from "next";

import { FooterPage } from "@/app/components/footer-page";

const TITLE = "Privacy Policy & Terms";
const DESCRIPTION =
  "Read BullBearVote’s privacy policy and terms, including how personal information is handled and the rules for using the community.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  alternates: {
    canonical: "/privacy-terms",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/privacy-terms",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },

  twitter: {
    card: "summary",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },
};

export default function PrivacyTermsPage() {
  return <FooterPage type="privacy_terms" />;
}
