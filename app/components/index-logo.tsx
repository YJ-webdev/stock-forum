// components/index-logo.tsx
import React from "react";

interface IndexLogoProps {
  symbol: string; // "US500", "US100", "US30", "KOSPI"
  size?: number; // 기본 32px
}

export function IndexLogo({ symbol, size = 32 }: IndexLogoProps) {
  const normalizedSymbol = symbol.toUpperCase();

  // 지수별 스타일 및 라벨 설정
  const getLogoConfig = () => {
    switch (normalizedSymbol) {
      case "US500":
      case "SPY":
      case "^GSPC":
        return {
          label: "500",
          bgColor: "bg-[#d1021a] text-white",
          brandColor: "#E11D48",
        };
      case "US100":
      case "QQQ":
      case "^IXIC":
        return {
          label: "100",
          bgColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
          brandColor: "#06B6D4",
        };
      case "US30":
      case "DIA":
      case "^DJI":
        return {
          label: "30",
          bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          brandColor: "#2563EB",
        };
      case "KOSPI":
      case "^KS11":
        return {
          label: "KS",
          bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
          brandColor: "#6366F1",
        };
      default:
        return {
          label: normalizedSymbol.slice(0, 3),
          bgColor: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
          brandColor: "#71717A",
        };
    }
  };

  const config = getLogoConfig();

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full border flex items-center p-[0.5] justify-center shrink-0 overflow-hidden ${config.bgColor}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="currentColor"
          fontSize="48"
          fontWeight="600"
          letterSpacing="-1"
        >
          {config.label}
        </text>
      </svg>
    </div>
  );
}
