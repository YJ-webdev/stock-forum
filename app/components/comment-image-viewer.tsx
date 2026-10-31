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
    width && Number.isFinite(width) && width > 0 ? width : 1600;

  const imageHeight =
    height && Number.isFinite(height) && height > 0 ? height : 1600;

  const aspectRatio = imageWidth / imageHeight;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const availableWidth = containerWidth || 180;

  const collapsedWidth = Math.min(180, imageWidth, availableWidth);

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
        <Image
          src={src}
          alt={alt}
          fill
          quality={hasExpanded ? 85 : 50}
          sizes={hasExpanded ? "(max-width: 768px) 100vw, 800px" : "180px"}
          loading="lazy"
          className="rounded-lg object-contain"
        />
      </motion.button>
    </div>
  );
}
