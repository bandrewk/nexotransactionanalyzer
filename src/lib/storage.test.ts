import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveTransactions,
  loadTransactions,
  hasSavedData,
  clearSavedData,
  APP_VERSION,
} from "./storage";
import type { Transaction } from "../types";

const mockTransaction: Transaction = {
  id: "NXT123",
  type: "Interest",
  inputCurrency: "BTC",
  inputAmount: 0.001,
  outputCurrency: "BTC",
  outputAmount: 0.001,
  usdEquivalent: 80,
  fee: "-",
  feeCurrency: "-",
  details: "approved / BTC Interest",
  dateTime: "2025-06-01 06:00:00",
};

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

describe("storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns null when no data is saved", () => {
    expect(loadTransactions()).toBeNull();
  });

  it("hasSavedData returns false initially", () => {
    expect(hasSavedData()).toBe(false);
  });

  it("saves and loads transactions", () => {
    const txs = [mockTransaction];
    saveTransactions(txs);
    expect(hasSavedData()).toBe(true);

    const loaded = loadTransactions();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].id).toBe("NXT123");
    expect(loaded![0].inputAmount).toBe(0.001);
  });

  it("clearSavedData removes everything", () => {
    saveTransactions([mockTransaction]);
    expect(hasSavedData()).toBe(true);

    clearSavedData();
    expect(hasSavedData()).toBe(false);
    expect(loadTransactions()).toBeNull();
  });

  it("returns null on version mismatch", () => {
    saveTransactions([mockTransaction]);
    store["nexo-ta-version"] = "old-version";
    expect(loadTransactions()).toBeNull();
    expect(hasSavedData()).toBe(false);
  });

  it("saves with correct version", () => {
    saveTransactions([mockTransaction]);
    expect(store["nexo-ta-version"]).toBe(APP_VERSION);
  });

  it("handles empty transaction array", () => {
    saveTransactions([]);
    const loaded = loadTransactions();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(0);
  });

  it("preserves all transaction fields", () => {
    saveTransactions([mockTransaction]);
    const loaded = loadTransactions()!;
    expect(loaded[0]).toEqual(mockTransaction);
  });

  it("handles corrupted localStorage gracefully", () => {
    store["nexo-ta-transactions"] = "not-valid-json";
    store["nexo-ta-saved"] = "true";
    store["nexo-ta-version"] = APP_VERSION;
    expect(loadTransactions()).toBeNull();
  });
});
