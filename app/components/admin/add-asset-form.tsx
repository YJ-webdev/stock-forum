"use client";

import * as React from "react";
import { createMarketAssetAction } from "@/app/actions/admin-assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle } from "lucide-react";

export function AddAssetForm() {
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createMarketAssetAction(formData);
      formRef.current?.reset();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-emerald-500" /> New Market Asset
      </h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label className="text-xs">Symbol / Ticker</Label>
          <Input
            name="symbol"
            placeholder="BTCUSD"
            required
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Asset Name</Label>
          <Input
            name="name"
            placeholder="Bitcoin"
            required
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Input
            name="category"
            placeholder="암호화폐, 지수, 원자재"
            required
            className="h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Initial Price</Label>
            <Input
              name="lastPrice"
              type="number"
              step="any"
              required
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Change %</Label>
            <Input
              name="changePercent"
              type="number"
              step="any"
              required
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">High</Label>
            <Input
              name="high"
              type="number"
              step="any"
              required
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Low</Label>
            <Input
              name="low"
              type="number"
              step="any"
              required
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Volume</Label>
          <Input
            name="volume"
            placeholder="1.2B"
            required
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Logo Image (Vercel Blob)</Label>
          <Input
            name="logo"
            type="file"
            accept="image/*"
            required
            className="h-8 text-xs cursor-pointer"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="w-full h-8 text-xs mt-2"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            "Save to Database"
          )}
        </Button>
      </form>
    </div>
  );
}
