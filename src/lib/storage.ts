import type { Transaction } from "../types";

const STORAGE_KEY = "nexo-ta-transactions";
const VERSION_KEY = "nexo-ta-version";
const SAVED_KEY = "nexo-ta-saved";
export const APP_VERSION = "4.0.0";

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    localStorage.setItem(SAVED_KEY, "true");
  } catch (e) {
    console.error("Failed to save transactions to localStorage:", e);
  }
}

export function loadTransactions(): Transaction[] | null {
  try {
    const version = localStorage.getItem(VERSION_KEY);
    if (version && version !== APP_VERSION) {
      clearSavedData();
      return null;
    }

    const saved = localStorage.getItem(SAVED_KEY);
    if (!saved) return null;

    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    return JSON.parse(data) as Transaction[];
  } catch {
    return null;
  }
}

export function hasSavedData(): boolean {
  return localStorage.getItem(SAVED_KEY) === "true";
}

export function clearSavedData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VERSION_KEY);
  localStorage.removeItem(SAVED_KEY);
}
