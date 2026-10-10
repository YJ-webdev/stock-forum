// app/components/footer-page.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { FOOTER_LABELS } from "@/lib/data/translations";

type FooterPageType = "help" | "feedback" | "privacy_terms" | "disclaimer";
type PolicyPageType = "privacy_terms" | "disclaimer";

interface FooterPageProps {
  type: FooterPageType;
}

interface PolicySection {
  title: string;
  content: string[];
}

const HELP_ITEMS = [
  {
    title: "How do predictions work?",
    content:
      "Choose Bull or Bear to predict an index’s next market session. Predictions are available before the market opens.",
  },
  {
    title: "Why is voting closed?",
    content:
      "Voting closes while the market is open. Check the market’s countdown for the next voting window.",
  },
  {
    title: "Which markets support predictions?",
    content:
      "Predictions are available for indices. You can discuss crypto, currencies, and commodities through comments.",
  },
  {
    title: "How do I manage my watchlist?",
    content:
      "Open Manage watchlist to add or remove markets. You can follow up to 20 markets.",
  },
  {
    title: "Can I change my language?",
    content:
      "Open account settings and select a language. Your selection is saved automatically.",
  },
];

const FEEDBACK_CATEGORIES = [
  { value: "suggestion", label: "Suggestion" },
  { value: "bug", label: "Bug report" },
  { value: "other", label: "Other" },
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

const POLICY_SECTIONS: Record<PolicyPageType, PolicySection[]> = {
  privacy_terms: [
    {
      title: "Information we collect",
      content: [
        "When you sign in with Google or GitHub, we receive account information such as your email address, username, profile image, and provider account identifier.",
        "We store the nationality, language, and watchlist preferences you choose, along with your activity on BullBearVote, including comments, replies, predictions, points history, likes, and reports.",
        "We use cookies to maintain your login session and may use local storage to remember interface preferences, such as your theme. Temporary cached data helps pages and market information load faster.",
      ],
    },
    {
      title: "How information is used",
      content: [
        "We use your information to manage your account, remember your preferences, provide community features, process predictions and points, and help prevent abuse.",
        "Your username, profile image, and public contributions may be visible to other users. Your nationality may appear alongside your contributions or in country-based statistics. Your email address and authentication details are not displayed publicly.",
        "Service providers supporting authentication, hosting, and data storage may process information as needed to operate the site. Information may also be disclosed where required by applicable law.",
      ],
    },
    {
      title: "Data storage and retention",
      content: [
        "Your information is stored using the services that support BullBearVote. These providers may process information in countries other than your country of residence.",
        "We retain information for as long as needed to provide your account and site features, maintain prediction records, address abuse or disputes, and meet applicable legal obligations. The retention period depends on the type of information and the purpose for which it is used.",
        "Temporary cached data may expire sooner than account records. Deleted information may remain in backups until those backups are replaced or expire.",
      ],
    },
    {
      title: "Account deletion",
      content: [
        "You can request account deletion using the contact details below. We may ask you to verify account ownership before processing your request.",
        "When handling your request, we will explain how deletion affects your profile, comments, replies, predictions, and points history, including any information that must be retained and the reasons for retaining it.",
        "Signing out, clearing your browser cookies, or disconnecting Google or GitHub does not by itself delete your BullBearVote account.",
      ],
    },
    {
      title: "Community rules",
      content: [
        "Keep discussions respectful and relevant to the market or topic. Disagreement is welcome, but harassment, threats, hate speech, and targeted abuse are not.",
        "Do not post spam, unsolicited advertising, scams, explicit sexual content, or another person's private information. Do not impersonate others or share content you do not have permission to use.",
        "Do not manipulate predictions, points, likes, or rankings through multiple accounts, automation, or exploitation of site errors.",
        "Content that violates these rules may be restricted or removed. Repeated or serious violations may result in account restrictions or suspension. You can report inappropriate content for review.",
      ],
    },
    {
      title: "Terms of use",
      content: [
        "BullBearVote provides market discussion and a virtual prediction game. It does not provide brokerage services or execute trades. You are responsible for your account activity and the content you submit.",
        "You retain ownership of your content. By submitting it, you grant BullBearVote permission to store, display, and process it as needed to operate and moderate the service.",
        "Predictions, community posts, rankings, and market information are not financial advice. Points have no monetary value and cannot be redeemed for cash.",
        "Market data and prediction results may contain errors. Results and points may be corrected when data or processing errors are identified.",
        "Features and prediction rules may change, and uninterrupted service is not guaranteed. These terms may be updated as the service changes. Nothing in these terms limits rights that cannot be excluded under applicable law.",
      ],
    },
    {
      title: "Contact",
      content: [
        "For privacy questions, account deletion requests, requests to access or correct your personal information, or concerns about moderation, contact us at [CONTACT EMAIL].",
        "Include your username and enough detail for us to understand your request. Never send your password, login codes, or authentication tokens.",
      ],
    },
  ],
  disclaimer: [
    {
      title: "Purpose of this website",
      content: [
        "BullBearVote is a community platform for discussing global markets and making virtual predictions about index performance.",
        "All information is provided for general information, discussion, and entertainment. Nothing on this website should be treated as investment advice or a recommendation to buy, sell, or hold any financial asset.",
        "You are responsible for your financial decisions. Consider your circumstances and seek qualified professional advice when needed.",
      ],
    },
    {
      title: "Market data and availability",
      content: [
        "Market prices, charts, trading hours, news, and other information are obtained from third-party sources and may be delayed, incomplete, or inaccurate.",
        "Holidays, changes to trading schedules, provider limitations, and technical issues may affect displayed market status and data availability. Charts may show the latest available session rather than the current day.",
        "We do not guarantee the accuracy, completeness, or timeliness of market information. Verify information independently before using it to make financial decisions.",
      ],
    },
    {
      title: "Predictions and points",
      content: [
        "Predictions are part of a virtual game and are available for supported indices before the relevant market session opens. Voting closes while the market is open.",
        "Points are virtual scores used within BullBearVote. They have no monetary value and cannot be withdrawn, exchanged for money, or redeemed for financial assets.",
        "Prediction outcomes depend on the site's settlement rules and available market data. Missing or corrected data, market closures, or technical errors may delay settlement or require results and points to be adjusted.",
        "Past prediction results and leaderboard positions do not establish investment expertise or guarantee future performance.",
      ],
    },
    {
      title: "Community content",
      content: [
        "Comments, replies, and predictions express the views of individual users and do not necessarily reflect the views of BullBearVote.",
        "Community content may be inaccurate, misleading, or speculative. A post's popularity, likes, or author ranking should not be treated as evidence that its claims are reliable.",
        "Moderation helps address inappropriate content but does not verify every claim or guarantee that all harmful content will be identified immediately. Report content that may violate the community rules.",
      ],
    },
    {
      title: "External links",
      content: [
        "BullBearVote may include links to news articles and other third-party websites. These links are provided for convenience and reference and do not imply endorsement.",
        "We do not control the content, availability, security, or privacy practices of external websites. Their own terms and privacy policies apply when you visit them.",
      ],
    },
  ],
};

export function FooterPage({ type }: FooterPageProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = FOOTER_LABELS[language];

  return (
    <main className="mx-auto min-h-[calc(100dvh-146px)] w-full max-w-2xl px-5 pt-5 pb-10 md:px-6">
      <h1 className="text-2xl font-medium tracking-tight text-zinc-800 dark:text-zinc-300">
        {labels[type]}
      </h1>

      <div className="mt-6">
        {type === "help" && <HelpContent />}

        {type === "feedback" && <FeedbackContent />}

        {(type === "privacy_terms" || type === "disclaimer") && (
          <PolicyContent type={type} />
        )}
      </div>
    </main>
  );
}

function HelpContent() {
  return (
    <div>
      <p className="mb-6 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
        Find answers about predictions, your watchlist, and account settings.
      </p>

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {HELP_ITEMS.map(({ title, content }) => (
          <details key={title} className="group">
            <summary
              className="
                flex min-h-14 cursor-pointer list-none
                items-center justify-between gap-4 py-4
                text-[15px] text-zinc-800
                dark:text-zinc-200
                [&::-webkit-details-marker]:hidden
              "
            >
              {title}

              <ChevronDown
                size={16}
                aria-hidden="true"
                className="
                  shrink-0 text-zinc-400
                  transition-transform duration-200
                  group-open:rotate-180
                  motion-reduce:transition-none
                "
              />
            </summary>

            <p className="pb-5 pr-6 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
              {content}
            </p>
          </details>
        ))}
      </div>

      <Link
        href="/feedback"
        className="
          mt-6 inline-flex items-center gap-2
          text-sm text-zinc-600 transition-colors
          hover:text-zinc-950
          dark:text-zinc-400 dark:hover:text-zinc-100
        "
      >
        <MessageSquare size={16} aria-hidden="true" />
        Share feedback
      </Link>
    </div>
  );
}

function FeedbackContent() {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");

  return (
    <div>
      <p className="text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
        Have an idea or found something that isn’t working? Tell us about it.
      </p>

      <form
        className="mt-7 space-y-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            What would you like to share?
          </legend>

          <div className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className={`
                  min-h-8.5 rounded-full px-4 text-sm
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-zinc-400
                  ${
                    category === value
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="feedback-message"
            className="mb-3 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Your feedback
          </label>

          <textarea
            id="feedback-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              category === "bug"
                ? "What happened, and what did you expect to happen?"
                : "What would you like us to improve?"
            }
            maxLength={2000}
            rows={7}
            className="
              block w-full resize-y rounded-xl
              border border-zinc-100 bg-zinc-100
              px-4 py-3 text-base leading-7 text-zinc-900
              outline-none placeholder:text-zinc-400
              focus:border-zinc-300 
              dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100
              dark:focus:border-zinc-600
              md:text-[15px]
            "
          />

          <p className="mt-2 text-end text-xs tabular-nums text-zinc-400">
            {message.length.toLocaleString("en-US")} / 2,000
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Feedback submission is not available yet.
          </p>

          <button
            type="submit"
            disabled
            className="
              min-h-8.5 rounded-full bg-zinc-900 px-5
              text-sm font-medium text-white
              disabled:cursor-default disabled:opacity-40
              dark:bg-zinc-100 dark:text-zinc-900
            "
          >
            Send feedback
          </button>
        </div>
      </form>
    </div>
  );
}

function PolicyContent({ type }: { type: PolicyPageType }) {
  const sections = POLICY_SECTIONS[type];

  const introduction =
    type === "privacy_terms"
      ? "Learn how BullBearVote handles your information and the rules that apply when you use the community."
      : "Please read these limitations before using market information, predictions, or community content on BullBearVote.";

  return (
    <div>
      <p className="mb-6 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
        {introduction}
      </p>

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {sections.map(({ title, content }) => (
          <details key={title} className="group">
            <summary
              className="
                flex min-h-14 cursor-pointer list-none
                items-center justify-between gap-4 py-4
                text-[15px] font-medium text-zinc-800
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-inset
                focus-visible:ring-zinc-400
                dark:text-zinc-200
                [&::-webkit-details-marker]:hidden
              "
            >
              <span>{title}</span>

              <ChevronDown
                size={16}
                aria-hidden="true"
                className="
                  shrink-0 text-zinc-400
                  transition-transform duration-200
                  group-open:rotate-180
                  motion-reduce:transition-none
                "
              />
            </summary>

            <div className="space-y-3 pb-5 pr-6">
              {content.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[15px] leading-7 text-zinc-500 dark:text-zinc-400"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
