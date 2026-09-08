// components/icons/market-logos.tsx
import React from "react";

type IconProps = {
  className?: string;
};

// 1. S&P 500 (공식 S&P Global 브랜드 심볼)
export function Sp500Logo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 4h8v3.5H6.5v3H11V14H3V4zm10 0h8v10h-4.5v-3.5H18.5V7.5H13V4zm-10 12h18v4H3v-4z" />
    </svg>
  );
}

// 2. 나스닥 (공식 NASDAQ 획 모양 리본 심볼)
export function NasdaqLogo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 3L10 12L4.5 21H8.5L14 12L8.5 3H4.5ZM10 3L15.5 12L10 21H14L19.5 12L14 3H10Z" />
    </svg>
  );
}

// 3. 코스피 / 한국거래소 (KRX 공식 트레이드마크 엠블럼)
export function KospiLogo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8l6.5 3.25v6.9L12 18.2l-6.5-3.25V8.05L12 4.8z" />
      <path d="M10 9h4v6h-4z" />
    </svg>
  );
}

// 4. 비트코인 (공식 BTC 심볼)
export function BitcoinLogo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#F7931A">
      <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548zM15.85 10.33c.307-2.053-1.258-3.158-3.4-3.896l.695-2.787-1.696-.424-.676 2.712c-.446-.112-.903-.217-1.358-.322l.68-2.727-1.696-.424-.695 2.786c-.368-.084-.73-.168-1.082-.256l-2.34-.585-.452 1.815s1.26.288 1.233.306c.688.172.812.628.791.99l-.793 3.18c.048.012.11.03.18.058l-.183-.046-1.11 4.453c-.084.208-.298.52-.779.402.017.025-1.234-.308-1.234-.308l-.845 1.948 2.208.551c.411.103.814.213 1.21.316l-.703 2.82 1.695.423.695-2.786c.463.125.912.24 1.352.348l-.69 2.77 1.696.424.702-2.812c2.894.548 5.07.327 5.986-2.29.74-2.108-.037-3.324-1.562-4.113 1.11-.256 1.947-.988 2.17-2.498zm-3.879 5.45c-.525 2.112-4.077.97-5.227.684l.932-3.738c1.15.287 4.832.856 4.295 3.054zm.526-5.48c-.48 1.921-3.438.945-4.398.706l.846-3.391c.96.24 4.041.688 3.552 2.685z" />
    </svg>
  );
}

// 5. 금 선물 (XAU - 골드 바 아이콘)
export function GoldLogo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#EAB308">
      <path d="M2 17l2-8h16l2 8H2zm2.5-2h15l-1-4h-13l-1 4zM5 5h14l1 3H4l1-3z" />
    </svg>
  );
}

// 6. WTI 원유 (Oil Drop - 오일 드롭)
export function OilLogo({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#F43F5E">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
