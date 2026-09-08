"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { executeTrade } from "@/app/actions/trades";

export interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  symbol: string;
  assetName: string;
  currentPrice: number;
  availableCash?: number;
}

export function TradeModal({
  isOpen,
  onClose,
  userId,
  symbol,
  assetName,
  currentPrice,
  availableCash = 0,
}: TradeModalProps) {
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const totalCost = quantity * currentPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await executeTrade({
        userId,
        symbol,
        type: tradeType,
        quantity,
        currentPrice,
      });

      if (result.success) {
        toast.success(`Order Executed!`, {
          description: `Successfully placed ${tradeType} order for ${quantity} ${symbol} at $${currentPrice.toLocaleString()}.`,
        });
        onClose();
      } else {
        toast.error("Trade Failed", {
          description:
            result.error || "Unable to process order. Please try again.",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Trade {assetName} ({symbol})
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTradeType("BUY")}
            className={`py-2 text-sm font-semibold rounded-lg ${
              tradeType === "BUY"
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setTradeType("SELL")}
            className={`py-2 text-sm font-semibold rounded-lg ${
              tradeType === "SELL"
                ? "bg-rose-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            SELL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">
              Current Price
            </label>
            <p className="text-lg font-bold">
              ${currentPrice.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">
              Quantity
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available Cash:</span>
              <span className="font-semibold">
                ${availableCash.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="font-bold text-foreground">
                ${totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 border rounded-lg hover:bg-muted font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`w-1/2 py-2 rounded-lg font-semibold text-sm text-white ${
                tradeType === "BUY"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50`}
            >
              {isPending ? "Processing..." : `Confirm ${tradeType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
