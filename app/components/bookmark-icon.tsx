// components/icons/BookmarkIcon.tsx
import React from "react";

export function BookmarkIcon({
  className = "w-3 h-7",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 28"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1.5 1.5h7a0.8 0.8 0 0 1 0.8 0.8v23.8a0.35 0.35 0 0 1-.58 0.26L5 22.8l-3.72 3.56a0.35 0.35 0 0 1-.58-.26V2.3a0.8 0.8 0 0 1 0.8-.8z" />
    </svg>
  );
}
