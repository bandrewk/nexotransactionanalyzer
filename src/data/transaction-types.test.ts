import { describe, it, expect } from "vitest";
import {
  TransactionType,
  TYPE_RULES,
  INTERNAL_TRANSFER_TYPES,
  getTypeRule,
} from "./transaction-types";

describe("transaction-types", () => {
  it("has identical key set between TYPE_RULES and Object.values(TransactionType)", () => {
    const knownTypes = Object.values(TransactionType).slice().sort();
    const ruleKeys = Object.keys(TYPE_RULES).slice().sort();
    expect(ruleKeys).toEqual(knownTypes);
    expect(knownTypes).toHaveLength(34);
  });

  it("ensures every rule has a non-empty user-facing why and at least one expectedShape", () => {
    for (const [type, rule] of Object.entries(TYPE_RULES)) {
      expect(rule.why, `rule for ${type} should have non-empty why`).toBeTruthy();
      expect(rule.why.trim().length, `rule for ${type} should have non-empty why text`).toBeGreaterThan(0);
      expect(
        rule.expectedShapes.length,
        `rule for ${type} should have >= 1 expectedShapes`
      ).toBeGreaterThanOrEqual(1);
      for (const shape of rule.expectedShapes) {
        expect(shape, `shape for ${type} must match shape grammar`).toMatch(
          /^in[+\-0?] out[+\-0?] (same|diff)$/
        );
      }
      expect(["observed", "inferred"]).toContain(rule.confidence);
      expect(["ignore", "generic", "debit-input"]).toContain(rule.effect);
    }
  });

  it("contains the nine historic INTERNAL_TRANSFER_TYPES members by literal name", () => {
    const historicMembers = [
      "Locking Term Deposit",
      "Unlocking Term Deposit",
      "Exchange To Withdraw",
      "Exchange Deposited On",
      "Transfer In",
      "Transfer Out",
      "Nexo Card Purchase",
      "Manual Repayment",
      "Liquidation",
    ];

    for (const member of historicMembers) {
      expect(
        INTERNAL_TRANSFER_TYPES.has(member),
        `${member} should be in INTERNAL_TRANSFER_TYPES`
      ).toBe(true);
    }
    expect(INTERNAL_TRANSFER_TYPES.size).toBeGreaterThanOrEqual(9);
  });

  it("returns rules for known types and undefined for unknown or prototype keys", () => {
    expect(getTypeRule("Interest")).toBeDefined();
    expect(getTypeRule("Interest")?.effect).toBe("generic");

    // Prototype keys must return undefined, not inherited Object methods
    const protoKeys = ["constructor", "toString", "valueOf", "__proto__"];
    for (const key of protoKeys) {
      expect(getTypeRule(key)).toBeUndefined();
    }

    expect(getTypeRule("NonExistentType")).toBeUndefined();
  });

  it("populates expectedCurrencies only on evidence-supported card and liquidation types", () => {
    expect(TYPE_RULES[TransactionType.EXCHANGELIQUIDATION].expectedCurrencies).toEqual({
      input: ["known"],
      output: ["credit-line"],
    });
    expect(TYPE_RULES[TransactionType.EXCHANGECREDIT].expectedCurrencies).toEqual({
      input: ["credit-line"],
    });
    expect(TYPE_RULES[TransactionType.CREDITCARDWITHDRAWALCREDIT].expectedCurrencies).toEqual({
      input: ["credit-line"],
    });
    expect(TYPE_RULES[TransactionType.NEXOCARDTRANSACTIONFEE].expectedCurrencies).toEqual({
      input: ["credit-line"],
    });
    expect(TYPE_RULES[TransactionType.CREDITCARDSTATUS].expectedCurrencies).toEqual({
      input: ["credit-line"],
    });

    const expectedCurrencyTypes = new Set([
      TransactionType.EXCHANGELIQUIDATION,
      TransactionType.EXCHANGECREDIT,
      TransactionType.CREDITCARDWITHDRAWALCREDIT,
      TransactionType.NEXOCARDTRANSACTIONFEE,
      TransactionType.CREDITCARDSTATUS,
    ]);

    for (const [type, rule] of Object.entries(TYPE_RULES)) {
      if (!expectedCurrencyTypes.has(type as TransactionType)) {
        expect(
          rule.expectedCurrencies,
          `rule for ${type} should not have expectedCurrencies`
        ).toBeUndefined();
      }
    }
  });
});
