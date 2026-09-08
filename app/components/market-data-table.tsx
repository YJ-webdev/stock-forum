"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketAssetClient } from "../data/type";
import { FlashPriceCell } from "./flash-price-cell";

// 1. Column Definitions
export const columns: ColumnDef<MarketAssetClient>[] = [
  {
    accessorKey: "name",
    header: "종목명",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-35">
        <div className="h-6 w-6 rounded bg-muted p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={row.original.logoUrl}
            alt={row.original.name}
            className="h-full w-full object-contain filter dark:brightness-110"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground">
            {row.original.name}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {row.original.symbol}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "카테고리",
    cell: ({ row }) => (
      <span className="text-[11px] font-medium text-muted-foreground">
        {row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "lastPrice",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto flex items-center gap-1 text-xs font-semibold p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        현재가
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <FlashPriceCell price={row.original.lastPrice} />,
  },

  {
    accessorKey: "changePercent",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto flex items-center gap-1 text-xs font-semibold p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        변동률
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const isUp = row.original.changePercent >= 0;
      return (
        <div
          className={`text-right text-xs font-semibold tabular-nums ${
            isUp
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isUp ? "+" : ""}
          {(row.original.changePercent ?? 0).toFixed(2)}%{" "}
        </div>
      );
    },
  },
  {
    accessorKey: "high",
    header: () => <div className="text-right text-xs">고가</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {row.original.high.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "low",
    header: () => <div className="text-right text-xs">저가</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {row.original.low.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "volume",
    header: () => <div className="text-right text-xs">거래량</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs font-mono tabular-nums text-muted-foreground">
        {row.original.volume}
      </div>
    ),
  },
];

const CATEGORIES = ["전체", "지수", "암호화폐", "원자재"] as const;

export function MarketDataTable({
  marketData: initialData = [],
}: {
  marketData?: MarketAssetClient[];
}) {
  const [data, setData] = React.useState<MarketAssetClient[]>(initialData);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>("전체");

  // Sync state if server props update
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Real-time price updates via Server-Sent Events (SSE)
  React.useEffect(() => {
    const eventSource = new EventSource("/api/prices");

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        setData((prevData) =>
          prevData.map((item) =>
            item.symbol === update.symbol
              ? {
                  ...item,
                  lastPrice: update.lastPrice,
                  changePercent: update.changePercent,
                }
              : item,
          ),
        );
      } catch (e) {
        console.error("Failed to parse SSE price update", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === "전체") {
      table.getColumn("category")?.setFilterValue(undefined);
    } else {
      table.getColumn("category")?.setFilterValue(category);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Search and Category Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticker or name..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9 px-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 px-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
