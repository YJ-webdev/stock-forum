import { prisma } from "@/lib/prisma";
import { AssetManagementTable } from "../components/admin/asset-management-table";
import { AddAssetForm } from "../components/admin/add-asset-form";
import { MarketAsset } from "@/generated/prisma/client";

export const dynamic = "force-dynamic"; // Prevent static pre-rendering caching issues

export default async function AdminPage() {
  let assets: MarketAsset[] = [];

  try {
    assets = await prisma.marketAsset.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch market assets from database:", error);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">
          Market Asset Management
        </h1>
        <p className="text-xs text-muted-foreground">
          Add, update, or remove financial assets displayed on the live
          dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AddAssetForm />
        </div>
        <div className="lg:col-span-2">
          <AssetManagementTable assets={assets} />
        </div>
      </div>
    </div>
  );
}
