// app/components/footer-page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage, type Language } from "@/lib/data/languages";

import { FOOTER_LABELS } from "@/lib/data/translations";

import {
  FOOTER_PAGE_CONTENT,
  type FooterPageContent,
  type FeedbackCategory,
} from "@/lib/data/footer-translations";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type FooterPageType = "help" | "feedback" | "privacy_terms" | "disclaimer";
type PolicyPageType = "privacy_terms" | "disclaimer";

interface FooterPageProps {
  type: FooterPageType;
}

const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["suggestion", "bug", "other"];

// -----------------------------------------------------------------------------
// PAGE
// -----------------------------------------------------------------------------

export function FooterPage({ type }: FooterPageProps) {
  const email = "youjung.dev@gmail.com";

  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);

  const labels = FOOTER_LABELS[language];
  const content = FOOTER_PAGE_CONTENT[language];

  return (
    <main className="mx-auto min-h-[calc(100dvh-146px)] w-full max-w-2xl px-5 pt-5 pb-10 md:px-6">
      <h1 className="text-2xl font-medium tracking-tight text-zinc-800 dark:text-zinc-300">
        {labels[type]}
      </h1>

      <div className="mt-6">
        {type === "help" && <HelpContent content={content} />}

        {type === "feedback" && (
          <FeedbackContent content={content} language={language} />
        )}

        {(type === "privacy_terms" || type === "disclaimer") && (
          <PolicyContent type={type} content={content} email={email} />
        )}
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// HELP
// -----------------------------------------------------------------------------

function HelpContent({ content: copy }: { content: FooterPageContent }) {
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div>
      <p className="mb-6 text-[15px] text-zinc-500 dark:text-zinc-400">
        {copy.help_intro}
      </p>

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {copy.help_items.map(({ title, content }, index) => {
          const triggerId = `help-${index}-trigger`;
          const contentId = `help-${index}-content`;
          const isOpen = openSection === index;

          return (
            <section key={index}>
              <h2>
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() =>
                    setOpenSection((current) =>
                      current === index ? null : index,
                    )
                  }
                  className="
                    flex min-h-14 w-full cursor-pointer
                    items-center justify-between gap-4 py-4
                    text-start text-[15px] font-medium text-zinc-800
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-inset
                    focus-visible:ring-zinc-400
                    dark:text-zinc-200
                  "
                >
                  <span>{title}</span>

                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`
                      shrink-0 text-zinc-400
                      transition-transform duration-250 ease-in-out
                      motion-reduce:transition-none
                      ${isOpen ? "rotate-180" : ""}
                    `}
                  />
                </button>
              </h2>

              <div
                id={contentId}
                role="region"
                aria-labelledby={triggerId}
                aria-hidden={!isOpen}
                inert={!isOpen}
                className={`
                  grid transition-[grid-template-rows,opacity,visibility]
                  duration-250 ease-in-out
                  motion-reduce:transition-none
                  ${
                    isOpen
                      ? "visible grid-rows-[1fr] opacity-100"
                      : "invisible grid-rows-[0fr] opacity-0"
                  }
                `}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="pb-5 pe-6 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
                    {content}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
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
        {copy.share_feedback}
      </Link>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FEEDBACK
// -----------------------------------------------------------------------------

function FeedbackContent({
  content: copy,
  language,
}: {
  content: FooterPageContent;
  language: Language;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");

  return (
    <div>
      <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
        {copy.feedback_intro}
      </p>

      <form
        className="mt-7 space-y-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {copy.feedback_question}
          </legend>

          <div className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className={`
                  min-h-8.5 cursor-pointer rounded-full px-4 text-sm
                  transition-colors
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                  ${
                    category === value
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }
                `}
              >
                {copy.categories[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="feedback-message"
            className="mb-3 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            {copy.your_feedback}
          </label>

          <textarea
            id="feedback-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              category === "bug"
                ? copy.bug_placeholder
                : copy.feedback_placeholder
            }
            maxLength={2000}
            rows={7}
            className="
              block w-full resize-y rounded-xl
              border border-zinc-100 bg-zinc-100
              px-4 py-3 text-base leading-7 text-zinc-900
              outline-none placeholder:text-zinc-400
              focus:border-zinc-300
              dark:border-zinc-800 dark:bg-zinc-800
              dark:text-zinc-100 dark:focus:border-zinc-600
              md:text-[15px]
            "
          />

          <p className="mt-2 text-end text-xs tabular-nums text-zinc-400">
            {message.length.toLocaleString(language)}
            {" / "}
            {(2000).toLocaleString(language)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {copy.unavailable}
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
            {copy.send}
          </button>
        </div>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// POLICY
// -----------------------------------------------------------------------------

function PolicyContent({
  type,
  content: copy,
  email,
}: {
  type: PolicyPageType;
  content: FooterPageContent;
  email: string;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const sections = copy[type];

  const introduction =
    type === "privacy_terms" ? copy.privacy_intro : copy.disclaimer_intro;

  return (
    <div>
      <p className="mb-6 text-[15px] text-zinc-500 dark:text-zinc-400">
        {introduction}
      </p>

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {sections.map(({ title, content }, index) => {
          const sectionKey = `${type}-${index}`;
          const triggerId = `${sectionKey}-trigger`;
          const contentId = `${sectionKey}-content`;
          const isOpen = openSection === sectionKey;

          return (
            <section key={sectionKey}>
              <h2>
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() =>
                    setOpenSection((current) =>
                      current === sectionKey ? null : sectionKey,
                    )
                  }
                  className="
                    flex min-h-14 w-full cursor-pointer
                    items-center justify-between gap-4 py-4
                    text-start text-[15px] font-medium text-zinc-800
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-inset
                    focus-visible:ring-zinc-400
                    dark:text-zinc-200
                  "
                >
                  <span>{title}</span>

                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`
                      shrink-0 text-zinc-400
                      transition-transform duration-250 ease-in-out
                      motion-reduce:transition-none
                      ${isOpen ? "rotate-180" : ""}
                    `}
                  />
                </button>
              </h2>

              <div
                id={contentId}
                role="region"
                aria-labelledby={triggerId}
                aria-hidden={!isOpen}
                inert={!isOpen}
                className={`
                  grid transition-[grid-template-rows,opacity,visibility]
                  duration-250 ease-in-out
                  motion-reduce:transition-none
                  ${
                    isOpen
                      ? "visible grid-rows-[1fr] opacity-100"
                      : "invisible grid-rows-[0fr] opacity-0"
                  }
                `}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-3 pb-5 pe-6">
                    {content.map((paragraph, paragraphIndex) => (
                      <p
                        key={paragraphIndex}
                        className="text-[15px] leading-7 text-zinc-500 dark:text-zinc-400"
                      >
                        {paragraph.replaceAll("{email}", () => email)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
