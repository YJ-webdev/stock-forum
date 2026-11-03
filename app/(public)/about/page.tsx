import type { Metadata } from "next";
import { FooterPage } from "@/app/components/footer-page";

export const metadata: Metadata = {
  title: "About BullBearVote | Global Stock Market Community",
  description:
    "Learn about BullBearVote, a global stock market discussion community for Bull and Bear index predictions, market sentiment, and leaderboards.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/about",
    title: "About BullBearVote | Global Stock Market Community",
    description:
      "Explore global stock index discussions, Bull and Bear predictions, community sentiment, and leaderboards on BullBearVote.",
  },
};

export default function AboutPage() {
  return <FooterPage type="about" />;
}
