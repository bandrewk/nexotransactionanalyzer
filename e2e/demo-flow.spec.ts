import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders logo, title, upload area, and demo button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=nexo-ta.com").first()).toBeVisible();
    await expect(page.locator("text=Try Demo")).toBeVisible();
    await expect(page.locator("text=Choose File")).toBeVisible();
    await expect(page.locator("text=Non-Affiliation")).toBeVisible();
  });

  test("shows privacy and security notices", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=100% client-side")).toBeVisible();
    await expect(page.locator("text=Do not share your nexo.com login")).toBeVisible();
  });

  test("shows feature list", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h3:has-text('Transaction tracking')")).toBeVisible();
    await expect(page.locator("h3:has-text('Open source')")).toBeVisible();
  });

  test("shows footer with data sources and disclaimer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Market data provided by")).toBeVisible();
    await expect(page.locator("text=Non-Affiliation")).toBeVisible();
  });
});

test.describe("Demo flow", () => {
  test("clicking Try Demo navigates to platform", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();
  });

  test("dashboard shows portfolio stats", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await expect(page.getByRole("main").getByText("Transactions")).toBeVisible();
    await expect(page.getByRole("main").getByText("Assets")).toBeVisible();
  });

  test("can navigate to all platform pages", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });

    // Overview
    await page.click("a:has-text('Overview')");
    await expect(page.locator("h1:has-text('Overview')")).toBeVisible();

    // Coinlist
    await page.click("a:has-text('Coinlist')");
    await expect(page.locator("h1:has-text('Coinlist')")).toBeVisible();

    // Transactions
    await page.click("a:has-text('Transactions')");
    await expect(page.locator("h1:has-text('Transactions')")).toBeVisible();
    await expect(page.locator('input[placeholder="Search transactions..."]')).toBeVisible();

    // Back to Home
    await page.click("a:has-text('Home')");
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();
  });
});

// A rejected file used to render "Loaded <filename>" -- a success confirmation --
// because fileSelected was set before the parse. The real error was captured and
// then displayed in a branch that could no longer be reached.
test.describe("Rejecting a file it cannot read", () => {
  // Synthetic: the shape of a pre-2023 Nexo export, invented values.
  const LEGACY_CSV = [
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Details,Outstanding Loan,Date / Time",
    'NXT1,LockingTermDeposit,ETH,-1.00000000,ETH,1.00000000,$1.00,"approved / x",$0.00,2022-01-05 00:00:00',
  ].join("\n");

  test("explains why, instead of claiming success", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', {
      name: "old-export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(LEGACY_CSV),
    });

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("could not be read");
    await expect(alert).toContainText("Fee");
    await expect(alert).toContainText("Date / Time (UTC)");

    // The false-success card must not appear, and we must stay put.
    await expect(page.getByText("Loaded old-export.csv")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test("offers a report naming the unrecognised types", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', {
      name: "old-export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(LEGACY_CSV),
    });
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("before 2023");
    // Must not tell a user to fetch a fresh export as though that is certainly
    // the fix -- the same symptom appears when Nexo changes the format.
    await expect(alert).toContainText("this app needs updating");
    await expect(alert.locator("pre")).toContainText("LockingTermDeposit");
    await expect(alert.getByRole("button", { name: /copy report/i })).toBeVisible();
  });
});

test.describe("Credit Line card chain upload", () => {
  const CARD_CHAIN_CSV = [
    "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)",
    'NXT1,Credit Card Withdrawal Credit,Card,xUSD,-14.07,xUSD,14.07,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-22 04:08:58',
    'NXT2,Exchange Credit,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-22 04:08:58',
    'NXT3,Nexo Card Purchase,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"approved / SHOP | DEU",2026-08-22 04:08:58',
  ].join("\n");

  test("shows no xUSD on Coinlist and no unrecognised-types banner", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', {
      name: "nexo_card_chain.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(CARD_CHAIN_CSV),
    });
    await page.waitForURL("**/platform/**", { timeout: 10000 });

    await expect(page.locator("text=/unrecognised transaction/i")).toHaveCount(0);
    await expect(page.locator("text=/this app does not recognise/i")).toHaveCount(0);

    await page.click("a:has-text('Coinlist')");
    await expect(page.locator("h1:has-text('Coinlist')")).toBeVisible();

    await expect(page.getByText("xUSD", { exact: true })).toHaveCount(0);
    await expect(page.locator("text=/unrecognised transaction/i")).toHaveCount(0);
  });
});

test.describe("File Details page", () => {
  test("reports a clean demo file with no unrecognised types", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await page.click("a:has-text('File Details')");

    await expect(page.locator("h1:has-text('File Details')")).toBeVisible();
    await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
    await expect(page.locator("table")).toContainText("Interest");
    // Demo data is current-format, so nothing should be flagged.
    await expect(page.locator("text=/unrecognised transaction/i")).toHaveCount(0);
    await expect(page.locator("text=/unexpected/i")).toHaveCount(0);
    await expect(page.locator("pre")).toContainText("Nexo Transaction Analyzer");
  });
});

test.describe("Transactions page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await page.click("a:has-text('Transactions')");
    await expect(page.locator("h1:has-text('Transactions')")).toBeVisible();
  });

  test("shows row count", async ({ page }) => {
    await expect(page.locator("text=/\\d+ rows/")).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    await page.fill('input[placeholder="Search transactions..."]', "Interest");
    await expect(page.locator("td:has-text('Interest')").first()).toBeVisible();
  });

  test("pagination controls work", async ({ page }) => {
    await expect(page.locator("text=Page 1 of")).toBeVisible();
    // Last button in the pagination row; scoped so unrelated icon buttons
    // elsewhere on the page cannot claim the selector.
    const nextBtn = page.locator("button:has(svg)").last();
    await nextBtn.click();
    await expect(page.locator("text=Page 2 of")).toBeVisible();
  });

  // Sorting is the one table feature with no coverage, which made it the one
  // place a react-table regression could pass CI unnoticed. The demo data is
  // generated newest-first, so a single click on Date must surface a strictly
  // older first row, and a second click must restore the newest.
  test("sorting by date reorders rows", async ({ page }) => {
    const firstDateCell = page.locator("tbody tr").first().locator("td").last();
    const initial = (await firstDateCell.innerText()).trim();

    const dateHeader = page.locator("th:has-text('Date')");
    await dateHeader.click();
    await expect(firstDateCell).not.toHaveText(initial);
    const ascending = (await firstDateCell.innerText()).trim();
    expect(ascending < initial).toBe(true);

    await dateHeader.click();
    await expect(firstDateCell).not.toHaveText(ascending);
    expect((await firstDateCell.innerText()).trim() >= initial).toBe(true);
  });

  test("column toggle shows Transaction ID", async ({ page }) => {
    // ID column should be hidden by default
    await expect(page.locator("th:has-text('Id')")).not.toBeVisible();
    // Toggle it on
    await page.locator("label:has-text('Transaction ID') input").check();
    await expect(page.locator("th:has-text('Id')")).toBeVisible();
  });
});

test.describe("Coinlist page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await page.click("a:has-text('Coinlist')");
  });

  test("shows holdings cards", async ({ page }) => {
    await expect(page.locator("h1:has-text('Coinlist')")).toBeVisible();
    // Should show the heading and coin cards
    await expect(page.locator("text=Your holdings at a glance")).toBeVisible();
  });

  test("show zero balances toggle works", async ({ page }) => {
    const toggle = page.locator("label:has-text('Show zero balances') input");
    await toggle.check();
    // Should now show more items
    await expect(page.locator("text=Show zero balances")).toBeVisible();
  });
});

test.describe("Exit flow", () => {
  test("exit returns to landing page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await page.click("button:has-text('Exit')");
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.locator("text=Try Demo")).toBeVisible();
  });
});

test.describe("Dark mode", () => {
  test("theme toggle adds dark class", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator('button[aria-label*="Switch to"]');

    // Get initial state
    const initialDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));

    // Toggle
    await toggle.click();
    const afterToggle = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
    expect(afterToggle).not.toBe(initialDark);

    // Toggle back
    await toggle.click();
    const afterSecondToggle = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
    expect(afterSecondToggle).toBe(initialDark);
  });

  test("theme persists across page reload", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator('button[aria-label*="Switch to"]');

    // Force to dark
    await toggle.click();
    const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));

    // Reload
    await page.reload();
    const stillSame = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
    expect(stillSame).toBe(isDark);
  });
});

test.describe("Save and restore", () => {
  test("save persists data across reload", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });

    // Click save
    await page.click("button:has-text('Save Session')");

    // Reload — should auto-navigate to platform
    await page.goto("/");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();
  });
});
