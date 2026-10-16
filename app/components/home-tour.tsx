"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";

const STORAGE_KEY = "bullbearvote:home-tour:v1";
const VIEWPORT_PADDING = 16;
const TOOLTIP_GAP = 16;

const STEPS = [
  { id: "predict", desktopOnly: false },
  { id: "search", desktopOnly: false },
  { id: "leaderboard", desktopOnly: true },
  { id: "composer", desktopOnly: false },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface HomeTourProps {
  enabled?: boolean;
}

interface TourLabels {
  skip: string;
  back: string;
  next: string;
  finish: string;
  close: string;
  steps: Record<StepId, { title: string; description: string }>;
}

interface TooltipPosition {
  left: number;
  top: number;
  ready: boolean;
  animate: boolean;
}

interface HighlightTarget {
  element: HTMLElement;
  radius: number;
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
        title: "Click to explore markets",
        description:
          "Click the search bar to open this panel. Browse markets by category or type to find a specific market.",
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
        title: "검색창을 눌러보세요",
        description:
          "검색창을 누르면 아래 시장 목록이 열려요. 카테고리별로 둘러보거나 원하는 시장을 검색할 수 있어요.",
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

  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(element);

  return style.display !== "none" && style.visibility !== "hidden";
}

function getTargets(id: StepId): HTMLElement[] {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`),
  ).filter(isVisible);

  const first = matches[0];

  if (!first) return [];
  if (id === "search") return matches;

  const group = first.closest<HTMLElement>(`[data-tour-group="${id}"]`);

  if (group) {
    return Array.from(
      group.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`),
    ).filter(isVisible);
  }

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

function getAvailableSteps(): StepId[] {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

  return STEPS.filter(
    (step) =>
      (!step.desktopOnly || isDesktop) && getTargets(step.id).length > 0,
  ).map((step) => step.id);
}

function setSearchPreview(open: boolean) {
  window.dispatchEvent(
    new CustomEvent("bullbearvote:tour-search", {
      detail: { open },
    }),
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function getRadius(element: HTMLElement) {
  const value = window.getComputedStyle(element).borderTopLeftRadius;

  if (value.endsWith("%")) {
    const rect = element.getBoundingClientRect();

    return Math.min(rect.width, rect.height) * (Number.parseFloat(value) / 100);
  }

  return Number.parseFloat(value) || 0;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  rect: DOMRect,
  radius: number,
) {
  const { left, top, width, height } = rect;
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(left + r, top);
  context.lineTo(left + width - r, top);
  context.quadraticCurveTo(left + width, top, left + width, top + r);
  context.lineTo(left + width, top + height - r);
  context.quadraticCurveTo(
    left + width,
    top + height,
    left + width - r,
    top + height,
  );
  context.lineTo(left + r, top + height);
  context.quadraticCurveTo(left, top + height, left, top + height - r);
  context.lineTo(left, top + r);
  context.quadraticCurveTo(left, top, left + r, top);
  context.closePath();
}

export function HomeTour({ enabled = true }: HomeTourProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const reducedMotion = useReducedMotion();

  const titleId = useId();
  const descriptionId = useId();

  const portalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const positionedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<StepId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const [position, setPosition] = useState<TooltipPosition>({
    left: VIEWPORT_PADDING,
    top: VIEWPORT_PADDING,
    ready: false,
    animate: false,
  });

  const activeStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const language = user?.language === "ko" ? "ko" : "en";
  const labels = LABELS[language];
  const content = activeStep ? labels.steps[activeStep] : null;

  const finishTour = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Closing still works without browser storage.
    }

    setOpen(false);
  }, []);

  useEffect(() => {
    if (!enabled || pathname !== "/") return;

    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // Continue when browser storage is unavailable.
    }

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
          positionedRef.current = false;

          setPosition({
            left: VIEWPORT_PADDING,
            top: VIEWPORT_PADDING,
            ready: false,
            animate: false,
          });

          setSteps(available);
          setStepIndex(0);
          setOpen(true);
          return;
        }
      }

      if (Date.now() - startedAt < 60_000) {
        timer = window.setTimeout(tryStart, 300);
      }
    }

    timer = window.setTimeout(tryStart, 500);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [enabled, pathname, user?.nationality]);

  useEffect(() => {
    if (pathname !== "/" || !enabled) {
      setOpen(false);
    }
  }, [pathname, enabled]);

  function changeStep(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    // Change immediately without waiting for an animation.
    setStepIndex(nextIndex);
  }

  useLayoutEffect(() => {
    if (!open || activeStep !== "composer") return;

    const buttons = getTargets("composer").filter(
      (element): element is HTMLButtonElement =>
        element instanceof HTMLButtonElement,
    );

    const originals = buttons.map((button) => ({
      button,
      color: button.style.getPropertyValue("color"),
      priority: button.style.getPropertyPriority("color"),
    }));

    const color = document.documentElement.classList.contains("dark")
      ? "#f4f4f5" // zinc-100
      : "#18181b"; // zinc-900

    for (const button of buttons) {
      button.style.setProperty("color", color, "important");
    }

    return () => {
      for (const { button, color, priority } of originals) {
        if (color) {
          button.style.setProperty("color", color, priority);
        } else {
          button.style.removeProperty("color");
        }
      }
    };
  }, [open, activeStep]);

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

      const focusOutside = !portal!.contains(document.activeElement);

      if (
        event.shiftKey &&
        (document.activeElement === first || focusOutside)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || focusOutside)
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

  useLayoutEffect(() => {
    if (!open || activeStep !== "search") return;

    setSearchPreview(true);

    return () => {
      setSearchPreview(false);
    };
  }, [open, activeStep]);

  // Temporarily show the leaderboard in full color and opacity,
  // with clear default text colors. Restore everything on exit.
  useLayoutEffect(() => {
    if (!open || activeStep !== "leaderboard") return;

    const elements = new Set<HTMLElement | SVGElement>();

    for (const target of getTargets("leaderboard")) {
      elements.add(target);

      target
        .querySelectorAll<HTMLElement | SVGElement>("*")
        .forEach((element) => elements.add(element));
    }

    const properties = [
      "filter",
      "-webkit-filter",
      "opacity",
      "color",
    ] as const;

    const originals = Array.from(elements).map((element) => ({
      element,
      styles: properties.map((property) => ({
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      })),
    }));

    const textColor = document.documentElement.classList.contains("dark")
      ? "#f4f4f5"
      : "#18181b";

    for (const element of elements) {
      element.style.setProperty("filter", "none", "important");
      element.style.setProperty("-webkit-filter", "none", "important");
      element.style.setProperty("opacity", "1", "important");

      const isAvatar =
        element.matches('[data-slot^="avatar"]') ||
        element.closest('[data-slot^="avatar"]');

      if (!isAvatar) {
        element.style.setProperty("color", textColor, "important");
      }
    }

    return () => {
      for (const { element, styles } of originals) {
        for (const { property, value, priority } of styles) {
          if (value) {
            element.style.setProperty(property, value, priority);
          } else {
            element.style.removeProperty(property);
          }
        }
      }
    };
  }, [open, activeStep]);

  useLayoutEffect(() => {
    if (!open || !activeStep) return;

    const step = activeStep;
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !tooltip || !context) return;

    let stopped = false;
    let frame = 0;
    let previousGeometry = "";
    let highlights: HighlightTarget[] = [];

    const startedAt = performance.now();

    function update() {
      if (stopped) return;

      const elements = getTargets(step);

      const targetsChanged =
        elements.length !== highlights.length ||
        elements.some(
          (element, index) => element !== highlights[index]?.element,
        );

      if (targetsChanged) {
        highlights = elements.map((element) => ({
          element,
          radius: getRadius(element),
        }));
      }

      const rects = highlights.map(({ element }) =>
        element.getBoundingClientRect(),
      );

      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const tooltipWidth = tooltip!.offsetWidth;
      const tooltipHeight = tooltip!.offsetHeight;

      const geometry = [
        width,
        height,
        ratio,
        tooltipWidth,
        tooltipHeight,
        ...rects.flatMap((rect) => [
          rect.left,
          rect.top,
          rect.width,
          rect.height,
        ]),
      ].join(",");

      if (geometry !== previousGeometry) {
        previousGeometry = geometry;

        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);

        if (canvas!.width !== pixelWidth || canvas!.height !== pixelHeight) {
          canvas!.width = pixelWidth;
          canvas!.height = pixelHeight;
        }

        context!.setTransform(ratio, 0, 0, ratio, 0, 0);
        context!.globalCompositeOperation = "source-over";
        context!.clearRect(0, 0, width, height);
        context!.fillStyle = "rgba(0, 0, 0, 0.6)";
        context!.fillRect(0, 0, width, height);

        context!.globalCompositeOperation = "destination-out";

        // Erase the highlight area completely.
        context!.fillStyle = "#000";

        rects.forEach((rect, index) => {
          roundedRect(context!, rect, highlights[index].radius);
          context!.fill();
        });

        context!.globalCompositeOperation = "source-over";

        context!.globalCompositeOperation = "source-over";

        if (rects.length > 0) {
          const left = Math.min(...rects.map((rect) => rect.left));
          const right = Math.max(...rects.map((rect) => rect.right));
          const top = Math.min(...rects.map((rect) => rect.top));
          const bottom = Math.max(...rects.map((rect) => rect.bottom));

          let centerX = (left + right) / 2;
          let tooltipTop: number;

          const inputIndex = highlights.findIndex(
            ({ element }) => element.id !== "market-search-results",
          );

          const inputRect = inputIndex >= 0 ? rects[inputIndex] : undefined;

          if (step === "search" && inputRect) {
            centerX = inputRect.left + inputRect.width / 2;
            tooltipTop = inputRect.bottom + 12;
          } else if (
            height - bottom - TOOLTIP_GAP - VIEWPORT_PADDING >=
            tooltipHeight
          ) {
            tooltipTop = bottom + TOOLTIP_GAP;
          } else if (top - TOOLTIP_GAP - VIEWPORT_PADDING >= tooltipHeight) {
            tooltipTop = top - tooltipHeight - TOOLTIP_GAP;
          } else {
            tooltipTop = height - tooltipHeight - VIEWPORT_PADDING;
          }

          const nextLeft = clamp(
            centerX - tooltipWidth / 2,
            VIEWPORT_PADDING,
            width - tooltipWidth - VIEWPORT_PADDING,
          );

          const nextTop = clamp(
            tooltipTop,
            VIEWPORT_PADDING,
            height - tooltipHeight - VIEWPORT_PADDING,
          );

          const animate = positionedRef.current;
          positionedRef.current = true;

          setPosition((previous) => {
            if (
              previous.ready &&
              previous.left === nextLeft &&
              previous.top === nextTop
            ) {
              return previous;
            }

            return {
              left: nextLeft,
              top: nextTop,
              ready: true,
              animate,
            };
          });
        }
      }

      if (highlights.length === 0 && performance.now() - startedAt > 1500) {
        finishTour();
        return;
      }

      frame = window.requestAnimationFrame(update);
    }

    const first = getTargets(step)[0];

    if (first && step !== "search") {
      const rect = first.getBoundingClientRect();

      if (
        rect.top < VIEWPORT_PADDING ||
        rect.bottom > window.innerHeight - tooltip.offsetHeight - TOOLTIP_GAP
      ) {
        first.scrollIntoView({
          behavior: "instant",
          block: "center",
          inline: "nearest",
        });
      }
    }

    update();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
    };
  }, [open, activeStep, language, finishTour]);

  if (!open || !content) return null;

  return createPortal(
    <div ref={portalRef} className="fixed inset-0 z-1000 isolate">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      <motion.div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={false}
        animate={{
          x: position.left,
          y: position.top,
        }}
        transition={
          reducedMotion || !position.animate
            ? { duration: 0 }
            : {
                type: "tween",
                duration: 0.22,
                ease: [0.16, 1, 0.3, 1],
                delay: 0,
              }
        }
        style={{
          visibility: position.ready ? "visible" : "hidden",
        }}
        className="
          fixed top-0 left-0 z-10
          w-85 max-w-[calc(100vw-32px)]
          max-h-[calc(100dvh-32px)] overflow-y-auto
          rounded-2xl border border-zinc-200
          bg-white p-5 text-zinc-900 shadow-2xl
          will-change-transform
          dark:border-zinc-700 dark:bg-zinc-900
          dark:text-zinc-100
        "
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

        <motion.div
          key={`${activeStep}-${language}`}
          initial={reducedMotion ? false : { opacity: 0.85 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.1 }}
        >
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
        </motion.div>

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
                onClick={() => changeStep(stepIndex - 1)}
                className="
                  flex h-9 cursor-pointer items-center
                  justify-center gap-1.5 rounded-lg px-3
                  text-xs text-zinc-600 transition-colors
                  hover:bg-zinc-100 hover:text-zinc-900
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-zinc-400
                  dark:text-zinc-100 dark:hover:bg-zinc-800
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
                text-white transition-colors hover:bg-zinc-700
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400
                focus-visible:ring-offset-2
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
      </motion.div>
    </div>,
    document.body,
  );
}
