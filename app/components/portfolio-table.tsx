"use client";

import { useState, useTransition } from "react";
import { closeTrade } from "@/app/actions/close-trade";
import { toast } from "sonner";

export interface OpenPosition {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
}

interface PortfolioTableProps {
  userId: string;
  positions: OpenPosition[];
}

export function PortfolioTable({ userId, positions }: PortfolioTableProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);

  const handleClose = (
    tradeId: string,
    symbol: string,
    currentPrice: number,
  ) => {
    setActiveTradeId(tradeId);
    startTransition(async () => {
      const res = await closeTrade({ tradeId, userId, currentPrice });

      if (res.success) {
        toast.success(`Position Closed`, {
          description: `Successfully closed active position for ${symbol}.`,
        });
      } else {
        toast.error("Failed to Close Position", {
          description:
            res.error || "An error occurred while closing the trade.",
        });
      }
      setActiveTradeId(null);
    });
  };

  if (positions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground border rounded-xl bg-background">
        No active positions open.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="p-4 border-b border-border font-semibold text-sm">
        Open Positions
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="p-3">Asset</th>
              <th className="p-3">Type</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Entry</th>
              <th className="p-3">Current</th>
              <th className="p-3">Unrealized P&L</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {positions.map((pos) => {
              const diff = pos.currentPrice - pos.entryPrice;
              const pnl =
                pos.type === "BUY" ? diff * pos.quantity : -diff * pos.quantity;
              const isPositive = pnl >= 0;

              return (
                <tr key={pos.id} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold">{pos.symbol}</td>
                  <td className="p-3 font-medium">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        pos.type === "BUY"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {pos.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{pos.quantity}</td>
                  <td className="p-3 font-mono">
                    ${pos.entryPrice.toLocaleString()}
                  </td>
                  <td className="p-3 font-mono">
                    ${pos.currentPrice.toLocaleString()}
                  </td>
                  <td
                    className={`p-3 font-mono font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {isPositive ? "+" : ""}${pnl.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() =>
                        handleClose(pos.id, pos.symbol, pos.currentPrice)
                      }
                      disabled={isPending && activeTradeId === pos.id}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                    >
                      {isPending && activeTradeId === pos.id
                        ? "Closing..."
                        : "Close"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
