"use client";

import { deleteMarketAssetAction } from "@/app/actions/admin/admin-assets";
import { Button } from "@/components/ui/button";
import { MarketAsset } from "@/generated/prisma/client";
import { Trash2 } from "lucide-react";

export function AssetManagementTable({ assets }: { assets: MarketAsset[] }) {
  async function handleDelete(id: string, logoUrl: string) {
    if (confirm("Are you sure you want to delete this asset?")) {
      await deleteMarketAssetAction(id, logoUrl);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-3 bg-muted/40 border-b">
        <h2 className="text-xs font-bold">Existing Assets ({assets.length})</h2>
      </div>
      <div className="divide-y">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center justify-between p-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <img
                src={asset.logoUrl}
                alt={asset.name}
                className="h-6 w-6 object-contain"
              />
              <div>
                <p className="font-bold">
                  {asset.name} ({asset.symbol})
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {asset.category}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(asset.id, asset.logoUrl)}
              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
