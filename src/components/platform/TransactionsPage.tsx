import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search, Filter, X } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { getExplorerUrl } from "../../lib/tx-linkage";
import type { Transaction } from "../../types";

const columnHelper = createColumnHelper<Transaction>();

export default function TransactionsPage() {
  const transactions = useAppStore((s) => s.transactions);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showId, setShowId] = useState(false);
  const [showFee, setShowFee] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const availableTypes = useMemo(() => {
    const types = [...new Set(transactions.map((t) => t.type))];
    return types.sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedTypes.length === 0) return transactions;
    return transactions.filter((t) => selectedTypes.includes(t.type));
  }, [transactions, selectedTypes]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<Transaction, any>[]>(
    () => [
      columnHelper.accessor("id", {
        header: "Id",
        cell: (info) => <span className="font-mono text-[1.05rem] text-slate-400">{info.getValue()}</span>,
        enableHiding: true,
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className="inline-flex px-2.5 py-0.5 rounded-md text-[1.1rem] font-medium
              bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
              {v}
            </span>
          );
        },
      }),
      columnHelper.accessor("inputCurrency", { header: "Input" }),
      columnHelper.accessor("inputAmount", {
        header: "Input Amt",
        cell: (info) => <span className="tabular-nums">{info.getValue().toFixed(8)}</span>,
      }),
      columnHelper.accessor("outputCurrency", { header: "Output" }),
      columnHelper.accessor("outputAmount", {
        header: "Output Amt",
        cell: (info) => <span className="tabular-nums">{info.getValue().toFixed(8)}</span>,
      }),
      columnHelper.accessor("usdEquivalent", {
        header: "USD",
        cell: (info) => (
          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
            ${info.getValue().toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor("details", {
        header: "Details",
        cell: (info) => {
          const row = info.row.original;
          const cleanDetails = row.details.replace(/^"|"$/g, "");
          const link = getExplorerUrl(row.type, row.inputCurrency, cleanDetails);
          if (link) {
            return (
              <span className="break-all text-[1.1rem]">
                {link.prefix}
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline">
                  {link.txHash.slice(0, 16)}...
                </a>
              </span>
            );
          }
          return <span className="break-all text-[1.1rem] text-slate-500">{cleanDetails}</span>;
        },
      }),
      columnHelper.accessor("fee", { header: "Fee", enableHiding: true }),
      columnHelper.accessor("dateTime", {
        header: showTime ? "Date / Time" : "Date",
        cell: (info) => (
          <span className="tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {showTime ? info.getValue() : info.getValue().slice(0, 10)}
          </span>
        ),
      }),
    ],
    [showTime]
  );

  const columnVisibility = useMemo(() => ({ id: showId, fee: showFee }), [showId, showFee]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-[2.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Transactions
        </h1>
        <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 mt-1">
          Browse, search, and sort your complete transaction history.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-[28rem] max-w-full rounded-xl text-[1.3rem]
              bg-white dark:bg-white/[0.04]
              border border-slate-200 dark:border-white/10
              text-slate-800 dark:text-slate-200
              placeholder:text-slate-400
              focus:border-accent/40 dark:focus:border-accent/40
              transition-colors"
          />
        </div>

        {/* Type filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[1.3rem] font-medium
              cursor-pointer border transition-colors ${
              selectedTypes.length > 0
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Filter size={14} />
            Type {selectedTypes.length > 0 && `(${selectedTypes.length})`}
          </button>
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="absolute -top-1.5 -right-1.5 w-[1.8rem] h-[1.8rem] rounded-full
                bg-accent text-white flex items-center justify-center
                cursor-pointer border-none hover:bg-accent-hover transition-colors"
            >
              <X size={10} />
            </button>
          )}
          {typeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
              <div className="absolute top-full left-0 mt-2 z-50 w-[26rem] max-h-[36rem] overflow-y-auto
                rounded-xl border border-slate-200 dark:border-white/10
                bg-white dark:bg-[#0d1328] shadow-xl p-2">
                {availableTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-[1.25rem]
                      cursor-pointer select-none
                      hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="accent-accent w-[1.4rem] h-[1.4rem]"
                    />
                    <span className="text-slate-700 dark:text-slate-300">{type}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-[1.2rem]">
          {[
            { label: "Transaction ID", checked: showId, set: setShowId },
            { label: "Fee", checked: showFee, set: setShowFee },
            { label: "Time", checked: showTime, set: setShowTime },
          ].map(({ label, checked, set }) => (
            <label key={label} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => set(!checked)}
                className="accent-accent w-[1.4rem] h-[1.4rem]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[1.25rem]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-slate-50 dark:bg-white/[0.02]">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="text-left py-3 px-4 text-[1.15rem] font-semibold
                        text-slate-500 dark:text-slate-400 uppercase tracking-wider
                        cursor-pointer select-none whitespace-nowrap
                        hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ChevronsUpDown size={12} className="opacity-40" />
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-50 dark:border-white/[0.04]
                    hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2.5 px-4 max-w-[32rem] overflow-hidden break-words">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[1.25rem] text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} &middot; {filteredTransactions.length} rows
          {selectedTypes.length > 0 && ` (filtered from ${transactions.length})`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]
              disabled:opacity-20 cursor-pointer disabled:cursor-default
              bg-transparent border-none transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]
              disabled:opacity-20 cursor-pointer disabled:cursor-default
              bg-transparent border-none transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
