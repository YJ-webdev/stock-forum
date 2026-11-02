"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

interface CommentImageViewerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

const PREVIEW_WIDTH = 180;
const FALLBACK_DIMENSION = 1600;

export function CommentImageViewer({
  src,
  alt,
  width,
  height,
}: CommentImageViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasExpanded, setHasExpanded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const imageWidth =
    typeof width === "number" && Number.isFinite(width) && width > 0
      ? width
      : FALLBACK_DIMENSION;

  const imageHeight =
    typeof height === "number" && Number.isFinite(height) && height > 0
      ? height
      : FALLBACK_DIMENSION;

  const aspectRatio = imageWidth / imageHeight;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      const nextWidth = entry.contentRect.width;

      setContainerWidth((previous) =>
        Math.abs(previous - nextWidth) < 1 ? previous : nextWidth,
      );
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const availableWidth = containerWidth || PREVIEW_WIDTH;

  const collapsedWidth = Math.min(PREVIEW_WIDTH, imageWidth, availableWidth);

  const expandedWidth = Math.min(imageWidth, availableWidth);

  const displayWidth = expanded ? expandedWidth : collapsedWidth;

  const displayHeight = displayWidth / aspectRatio;

  function handleToggle() {
    if (!expanded) {
      setHasExpanded(true);
    }

    setExpanded((previous) => !previous);
  }

  return (
    <div ref={containerRef} className="mt-3 w-full min-w-0">
      <motion.button
        initial={false}
        type="button"
        aria-label={alt.trim() || "Image"}
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation();
          handleToggle();
        }}
        animate={{
          width: displayWidth,
          height: displayHeight,
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.3,
          ease: "easeInOut",
        }}
        className={`
          relative block overflow-hidden rounded-lg
          border-0 p-0
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-zinc-400
          focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-zinc-900
          ${expanded ? "cursor-zoom-out" : "cursor-zoom-in"}
        `}
      >
        {hasExpanded ? (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            className="rounded-lg object-contain"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            quality={50}
            sizes="180px"
            loading="lazy"
            className="rounded-lg object-contain"
          />
        )}
      </motion.button>
    </div>
  );
}
