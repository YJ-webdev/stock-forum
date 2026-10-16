"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";

const STORAGE_KEY = "bullbearvote:home-tour:v1";

const FADE_DURATION = 160;
const DESKTOP_QUERY = "(min-width: 1024px)";
const VIEWPORT_PADDING = 16;
const TOOLTIP_GAP = 18;

const STEPS = [
  { id: "predict", desktopOnly: false },
  { id: "search", desktopOnly: false },
  { id: "leaderboard", desktopOnly: true },
  { id: "composer", desktopOnly: false },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type Phase = "hidden" | "visible";

interface HomeTourProps {
  enabled?: boolean;
}

interface TourLabels {
  skip: string;
  back: string;
  next: string;
  finish: string;
  close: string;
  steps: Record<
    StepId,
    {
      title: string;
      description: string;
    }
  >;
}

const LABELS: Record<"en" | "ko", TourLabels> = {
  en: {
    skip: "Skip",
    back: "Back",
    next: "Next",
    finish: "Get started",
    close: "Close tutorial",
    steps: {
      predict: {
        title: "Bull or Bear?",
        description:
          "Predict the next session before the market opens. Choose Bull or Bear and put your market view to the test.",
      },
      search: {
        title: "Find your market",
        description:
          "Search for markets around the world. You can also open search with Ctrl + K or ⌘ + K.",
      },
      leaderboard: {
        title: "Climb the leaderboard",
        description:
          "Make predictions, earn points, and see how you rank against the community.",
      },
      composer: {
        title: "Join the conversation",
        description:
          "Choose a market and share your thoughts, questions, or market outlook with the community.",
      },
    },
  },
  ko: {
    skip: "건너뛰기",
    back: "이전",
    next: "다음",
    finish: "시작하기",
    close: "튜토리얼 닫기",
    steps: {
      predict: {
        title: "상승일까, 하락일까?",
        description:
          "장이 열리기 전에 다음 장의 방향을 예측해 보세요. Bull 또는 Bear를 선택하고 나의 시장 전망을 확인해 보세요.",
      },
      search: {
        title: "관심 있는 시장 찾기",
        description:
          "전 세계 시장을 검색해 보세요. Ctrl + K 또는 ⌘ + K로도 검색창을 열 수 있어요.",
      },
      leaderboard: {
        title: "리더보드에 도전하세요",
        description:
          "예측에 참여하고 포인트를 모아 커뮤니티에서 나의 순위를 확인해 보세요.",
      },
      composer: {
        title: "이야기에 참여하세요",
        description:
          "시장을 선택하고 나의 생각이나 궁금한 점, 시장 전망을 커뮤니티와 나눠 보세요.",
      },
    },
  },
};

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function getTargets(id: StepId): HTMLElement[] {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`),
  ).filter(isVisible);

  const first = matches[0];

  if (!first) return [];

  // A group can contain multiple separate highlighted elements.
  const group = first.closest<HTMLElement>(`[data-tour-group="${id}"]`);

  if (group) {
    return Array.from(
      group.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`),
    ).filter(isVisible);
  }

  // Keep Bull/Bear buttons together without selecting other cards.
  if (id === "predict" && first.parentElement) {
    const siblings = Array.from(
      first.parentElement.querySelectorAll<HTMLElement>(
        '[data-tour="predict"]',
      ),
    ).filter(isVisible);

    if (siblings.length > 0) return siblings;
  }

  return [first];
}

function getAvailableSteps() {
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;

  return STEPS.filter(
    (step) =>
      (!step.desktopOnly || isDesktop) && getTargets(step.id).length > 0,
  ).map((step) => step.id);
}

function copyComputedStyles(source: Element, destination: Element) {
  const computed = window.getComputedStyle(source);
  const target = destination as HTMLElement | SVGElement;

  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);

    target.style.setProperty(property, computed.getPropertyValue(property));
  }

  // The visual copy must stay still and never accept interaction.
  target.style.setProperty("animation", "none", "important");
  target.style.setProperty("transition", "none", "important");
  target.style.setProperty("pointer-events", "none", "important");

  destination.removeAttribute("id");
  destination.removeAttribute("autofocus");
  destination.removeAttribute("data-tour");
  destination.removeAttribute("data-tour-group");

  const sourceChildren = source.children;
  const destinationChildren = destination.children;

  for (let index = 0; index < sourceChildren.length; index += 1) {
    const destinationChild = destinationChildren[index];

    if (destinationChild) {
      copyComputedStyles(sourceChildren[index], destinationChild);
    }
  }
}

function createVisualCopy(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;

  copyComputedStyles(source, clone);

  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");

  // Positioning is controlled by the fixed wrapper.
  clone.style.setProperty("position", "relative", "important");
  clone.style.setProperty("inset", "auto", "important");
  clone.style.setProperty("margin", "0", "important");
  clone.style.setProperty("transform", "none", "important");
  clone.style.setProperty("width", "100%", "important");
  clone.style.setProperty("height", "100%", "important");
  clone.style.setProperty("box-sizing", "border-box", "important");

  return clone;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function HomeTour({ enabled = true }: HomeTourProps) {
  const pathname = usePathname();
  const user = useCurrentUser();

  const titleId = useId();
  const descriptionId = useId();

  const portalRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const transitionTimerRef = useRef<number | undefined>(undefined);

  const busyRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<StepId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [transitioning, setTransitioning] = useState(false);

  const language = user?.language === "ko" ? "ko" : "en";
  const labels = LABELS[language];

  const activeStep = steps[stepIndex];
  const content = activeStep ? labels.steps[activeStep] : null;
  const isLastStep = stepIndex === steps.length - 1;

  const finishTour = useCallback(() => {
    window.clearTimeout(transitionTimerRef.current);

    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Closing still works when browser storage is unavailable.
    }

    busyRef.current = false;
    setTransitioning(false);
    setOpen(false);
    setPhase("hidden");
  }, []);

  // Wait for streamed targets and onboarding to finish.
  useEffect(() => {
    if (!enabled || pathname !== "/") return;

    let completed = false;

    try {
      completed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      completed = false;
    }

    if (completed) return;

    let stopped = false;
    let timer: number | undefined;

    const startedAt = Date.now();

    function tryStart() {
      if (stopped) return;

      const dialogOpen = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"]',
      );

      if (!dialogOpen) {
        const available = getAvailableSteps();

        if (available.length > 0) {
          setSteps(available);
          setStepIndex(0);
          setPhase("hidden");
          setOpen(true);
          return;
        }
      }

      if (Date.now() - startedAt < 60_000) {
        timer = window.setTimeout(tryStart, 400);
      }
    }

    timer = window.setTimeout(tryStart, 700);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [enabled, pathname, user?.nationality]);

  useEffect(() => {
    if (pathname !== "/" || !enabled) {
      window.clearTimeout(transitionTimerRef.current);
      busyRef.current = false;
      setTransitioning(false);
      setOpen(false);
    }
  }, [pathname, enabled]);

  useEffect(
    () => () => {
      window.clearTimeout(transitionTimerRef.current);
    },
    [],
  );

  function changeStep(nextIndex: number) {
    if (busyRef.current || nextIndex < 0 || nextIndex >= steps.length) {
      return;
    }

    busyRef.current = true;
    setTransitioning(true);
    setPhase("hidden");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    transitionTimerRef.current = window.setTimeout(
      () => {
        setStepIndex(nextIndex);
      },
      reducedMotion ? 0 : FADE_DURATION,
    );
  }

  // Block background interaction and keep focus inside the tour.
  useEffect(() => {
    if (!open) return;

    const portal = portalRef.current;

    if (!portal) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const backgroundElements = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== portal,
      )
      .map((element) => ({
        element,
        wasInert: element.hasAttribute("inert"),
      }));

    for (const { element } of backgroundElements) {
      element.setAttribute("inert", "");
    }

    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      nextButtonRef.current?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishTour();
        return;
      }

      if (event.key !== "Tab") return;

      const buttons = Array.from(
        portal!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      ).filter(isVisible);

      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      if (!first || !last) return;

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !portal!.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !portal!.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = previousOverflow;

      for (const { element, wasInert } of backgroundElements) {
        if (!wasInert) element.removeAttribute("inert");
      }

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, finishTour]);

  // Build the copies once per step, then track their actual positions.
  useEffect(() => {
    if (!open || !activeStep) return;

    const highlightLayer = highlightsRef.current;
    const tooltip = tooltipRef.current;

    if (!highlightLayer || !tooltip) return;

    const targets = getTargets(activeStep);

    if (targets.length === 0) {
      finishTour();
      return;
    }

    highlightLayer.replaceChildren();

    const wrappers = targets.map((target) => {
      const wrapper = document.createElement("div");

      wrapper.style.position = "fixed";
      wrapper.style.pointerEvents = "none";
      wrapper.style.boxSizing = "border-box";

      wrapper.appendChild(createVisualCopy(target));
      highlightLayer.appendChild(wrapper);

      return wrapper;
    });

    // Scroll only when the target is outside the usable viewport.
    const initialRect = targets[0].getBoundingClientRect();
    const tooltipHeight = tooltip.offsetHeight;

    if (
      initialRect.top < VIEWPORT_PADDING ||
      initialRect.bottom > window.innerHeight - tooltipHeight - TOOLTIP_GAP
    ) {
      targets[0].scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "nearest",
      });
    }

    let frame = 0;
    let revealFrame = 0;
    let previousGeometry = "";

    function updatePosition() {
      if (!tooltip || !highlightLayer) return;

      const rects = targets.map((target) => target.getBoundingClientRect());

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const geometry = [
        viewportWidth,
        viewportHeight,
        tooltip.offsetWidth,
        tooltip.offsetHeight,
        ...rects.flatMap((rect) => [
          rect.left,
          rect.top,
          rect.width,
          rect.height,
        ]),
      ].join(",");

      if (geometry !== previousGeometry) {
        previousGeometry = geometry;

        rects.forEach((rect, index) => {
          const wrapper = wrappers[index];

          wrapper.style.left = `${rect.left}px`;
          wrapper.style.top = `${rect.top}px`;
          wrapper.style.width = `${rect.width}px`;
          wrapper.style.height = `${rect.height}px`;

          wrapper.style.visibility =
            rect.width > 0 && rect.height > 0 ? "visible" : "hidden";
        });

        const left = Math.min(...rects.map((rect) => rect.left));
        const right = Math.max(...rects.map((rect) => rect.right));
        const top = Math.min(...rects.map((rect) => rect.top));
        const bottom = Math.max(...rects.map((rect) => rect.bottom));

        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;

        const availableBelow =
          viewportHeight - bottom - TOOLTIP_GAP - VIEWPORT_PADDING;
        const availableAbove = top - TOOLTIP_GAP - VIEWPORT_PADDING;

        let tooltipTop: number;

        if (availableBelow >= height) {
          tooltipTop = bottom + TOOLTIP_GAP;
        } else if (availableAbove >= height) {
          tooltipTop = top - height - TOOLTIP_GAP;
        } else {
          tooltipTop = viewportHeight - height - VIEWPORT_PADDING;
        }

        const tooltipLeft = clamp(
          (left + right) / 2 - width / 2,
          VIEWPORT_PADDING,
          viewportWidth - width - VIEWPORT_PADDING,
        );

        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.top = `${clamp(
          tooltipTop,
          VIEWPORT_PADDING,
          viewportHeight - height - VIEWPORT_PADDING,
        )}px`;
      }

      frame = window.requestAnimationFrame(updatePosition);
    }

    updatePosition();

    revealFrame = window.requestAnimationFrame(() => {
      setPhase("visible");
      busyRef.current = false;
      setTransitioning(false);
      nextButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(revealFrame);
      highlightLayer.replaceChildren();
    };
  }, [open, activeStep, language, finishTour]);

  if (!open || !content) return null;

  return createPortal(
    <div ref={portalRef} className="fixed inset-0 z-1000 isolate">
      {/* This stays mounted while moving between steps. */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />

      {/* Styled visual copies appear above the backdrop. */}
      <div
        ref={highlightsRef}
        aria-hidden="true"
        className={`
          pointer-events-none absolute inset-0
          transition-opacity duration-150 ease-out
          motion-reduce:transition-none
          ${phase === "visible" ? "opacity-100" : "opacity-0"}
        `}
      />

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`
          fixed w-85 max-w-[calc(100vw-32px)]
          max-h-[calc(100dvh-32px)] overflow-y-auto
          rounded-2xl border border-zinc-200
          bg-white p-5 text-zinc-900 shadow-2xl
          transition-[opacity,transform] duration-150 ease-out
          motion-reduce:transition-none
          dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100
          ${
            phase === "visible"
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0"
          }
        `}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {stepIndex + 1} / {steps.length}
          </span>

          <button
            type="button"
            aria-label={labels.close}
            onClick={finishTour}
            className="
              -mr-1 flex size-7 cursor-pointer items-center
              justify-center rounded-full text-zinc-400
              transition-colors hover:bg-zinc-100
              hover:text-zinc-800
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-zinc-400
              dark:hover:bg-zinc-800 dark:hover:text-zinc-100
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <h2 id={titleId} className="text-[17px] font-medium leading-6">
          {content.title}
        </h2>

        <p
          id={descriptionId}
          className="
            mt-2 text-[14px] leading-6
            text-zinc-600 dark:text-zinc-400
          "
        >
          {content.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finishTour}
            className="
              cursor-pointer rounded-md py-2 text-xs
              text-zinc-500 transition-colors
              hover:text-zinc-900
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-zinc-400
              dark:text-zinc-400 dark:hover:text-zinc-100
            "
          >
            {labels.skip}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                disabled={transitioning}
                onClick={() => changeStep(stepIndex - 1)}
                className="
                  flex h-9 cursor-pointer items-center
                  justify-center gap-1.5 rounded-lg px-3
                  text-xs text-zinc-600 transition-colors
                  hover:bg-zinc-100 hover:text-zinc-900
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-zinc-400
                  disabled:cursor-default
                  dark:text-zinc-300 dark:hover:bg-zinc-800
                  dark:hover:text-white
                "
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {labels.back}
              </button>
            )}

            <button
              ref={nextButtonRef}
              type="button"
              disabled={transitioning}
              onClick={() => {
                if (isLastStep) {
                  finishTour();
                } else {
                  changeStep(stepIndex + 1);
                }
              }}
              className="
                flex h-9 cursor-pointer items-center
                justify-center gap-1.5 rounded-lg
                bg-zinc-900 px-3.5 text-xs font-medium
                text-white transition-colors
                hover:bg-zinc-700
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400
                focus-visible:ring-offset-2
                disabled:cursor-default
                dark:bg-zinc-100 dark:text-zinc-900
                dark:hover:bg-white
                dark:focus-visible:ring-offset-zinc-900
              "
            >
              {isLastStep ? labels.finish : labels.next}

              {!isLastStep && (
                <ArrowRight className="size-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
