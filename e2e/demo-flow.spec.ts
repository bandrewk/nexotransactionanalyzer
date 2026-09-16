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

  const REPAYMENT_CSV = [
    "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)",
    'NXT1,Deposit To Exchange,,EUR,1000.00,EURX,1000.00,$1100.00,-,-,"approved / EUR deposit",2026-08-20 10:00:00',
    'NXT2,Manual Sell Order,,EURX,-200.00,EURX,0.00,$220.00,-,-,"approved / Crypto repayment",2026-08-22 04:08:57',
    'NXT3,Exchange Liquidation,,EURX,200.00,USDX,220.00,$220.00,-,-,"approved / Crypto repayment / Exchange EURX to USDX",2026-08-22 04:08:58',
    'NXT4,Manual Repayment,,USDX,220.00,USDX,0.00,$220.00,-,-,"approved / Crypto repayment",2026-08-22 04:08:58',
  ].join("\n");

  test("debits a card repayment once", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', {
      name: "nexo_repayment.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(REPAYMENT_CSV),
    });
    await page.waitForURL("**/platform/**", { timeout: 10000 });

    await page.click("a:has-text('Coinlist')");
    await expect(page.locator("h1:has-text('Coinlist')")).toBeVisible();

    await expect(page.getByText(/^800(\.0+)?$/)).toBeVisible();
    await expect(page.getByText(/^600(\.0+)?$/)).toHaveCount(0);
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
    await expect(page.locator("table", { hasText: "Handling" })).toContainText("Interest");
    // Demo data is current-format, so nothing should be flagged.
    await expect(page.locator("text=/unrecognised transaction/i")).toHaveCount(0);
    await expect(page.locator("text=/unexpected/i")).toHaveCount(0);
    await expect(page.locator("pre")).toContainText("Nexo Transaction Analyzer");
  });

  test("marks an asset as not on Nexo and compares it against zero", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try Demo");
    await page.waitForURL("**/platform/**", { timeout: 10000 });
    await page.click("nav a:has-text('File Details')");
    await expect(page.locator("text=Compare with Nexo").first()).toBeVisible();

    const table = page.locator('table:has(th:text-is("Not on Nexo"))');
    const switches = table.getByRole("switch");
    const count = await switches.count();
    // Answer every row the only other way: none of them are on Nexo.
    for (let i = 0; i < count; i++) await switches.nth(i).click();
    await expect(table.locator("tbody tr").first().getByRole("textbox")).toBeDisabled();

    await page.click("button:has-text('Apply comparison')");
    await expect(page.getByText(new RegExp(`all ${count} assets compared`))).toBeVisible();
    await expect(page.locator("pre")).toContainText("**Every holding was compared.**");
  });

  test("puts applied Nexo balances into the report and resets them for a new file", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const upload = async (rows: string[]) => {
      await page.goto("/");
      await page.setInputFiles('input[type="file"]', {
        name: "nexo_compare.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          [
            "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)",
            ...rows,
          ].join("\n")
        ),
      });
      await page.waitForURL("**/platform/**", { timeout: 10000 });
      await page.click("a:has-text('File Details')");
    };

    await upload([
      'NXT1,Top up Crypto,BTC,0.01000000,BTC,0.01000000,$600.00,-,-,"approved / 0xabc",2026-08-20 10:00:00',
      'NXT2,Top up Crypto,ETH,1.50000000,ETH,1.50000000,$3000.00,-,-,"approved / 0xdef",2026-08-21 10:00:00',
    ]);

    await expect(page.getByRole("heading", { name: "Compare with Nexo" })).toBeVisible();
    await expect(page.getByText("Read this before you post it")).toBeVisible();
    const report = page.locator("pre");
    await expect(report).toContainText("BTC 0.01; ETH 1.5");
    await expect(report).not.toContainText("#### Comparison with Nexo");

    await page.getByLabel("Nexo shows BTC").fill("0.015");

    // A row with no answer blocks Apply: a blank must not read as agreement.
    await page.click("button:has-text('Apply comparison')");
    await expect(page.locator('[role="status"]').filter({ hasText: /Every asset needs an answer/ })).toBeVisible();
    await expect(report).not.toContainText("#### Comparison with Nexo");

    const eth = page.getByLabel("Nexo shows ETH");
    await eth.fill("2,800");
    await expect(eth).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Ambiguous: write 2800, 2,800.00 or 2.8", { exact: true })).toBeVisible();
    await page.click("button:has-text('Apply comparison')");
    await expect(page.getByText(/not a number/)).toBeVisible();
    await expect(report).not.toContainText("#### Comparison with Nexo");

    await eth.fill("1.5");
    await page.click("button:has-text('Apply comparison')");
    await expect(page.getByText(/all 2 assets compared/)).toBeVisible();
    await expect(report).toContainText("| BTC | 0.01 | 0.015 | +0.005 | 33.33% |");
    await expect(report).toContainText("**Every holding was compared.**");

    const shown = await report.textContent();
    await page.click("button:has-text('Copy report')");
    await expect(page.getByText("Copied", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("button:has-text('Download')"),
    ]);
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString("utf8")).toBe(shown);

    await page.click("button:has-text('Exit')");
    await page.waitForURL("/", { timeout: 5000 });
    await upload(['NXT3,Top up Crypto,BTC,0.02000000,BTC,0.02000000,$1200.00,-,-,"approved / 0x123",2026-08-22 10:00:00']);
    await expect(page.locator("pre")).toContainText("BTC 0.02");
    await expect(page.locator("pre")).not.toContainText("#### Comparison with Nexo");
    await expect(page.getByLabel("Nexo shows BTC")).toHaveValue("");
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
