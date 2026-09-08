"use client";

import { AccountSummary } from "@/app/actions/get-account-summary";

export function AccountSummaryCards({ summary }: { summary: AccountSummary }) {
  const isPositive = summary.overallPnl >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <div className="rounded-xl border border-border p-4 bg-background">
        <span className="text-xs text-muted-foreground uppercase font-semibold">
          Total Equity
        </span>
        <p className="text-xl font-bold font-mono mt-1">
          ${summary.totalEquity.toLocaleString()}
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 bg-background">
        <span className="text-xs text-muted-foreground uppercase font-semibold">
          Cash Available
        </span>
        <p className="text-xl font-bold font-mono mt-1">
          ${summary.cash.toLocaleString()}
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 bg-background">
        <span className="text-xs text-muted-foreground uppercase font-semibold">
          Unrealized P&L
        </span>
        <p
          className={`text-xl font-bold font-mono mt-1 ${summary.unrealizedPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
        >
          {summary.unrealizedPnl >= 0 ? "+" : ""}$
          {summary.unrealizedPnl.toFixed(2)}
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 bg-background">
        <span className="text-xs text-muted-foreground uppercase font-semibold">
          Overall P&L
        </span>
        <p
          className={`text-xl font-bold font-mono mt-1 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
        >
          {isPositive ? "+" : ""}${summary.overallPnl.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
