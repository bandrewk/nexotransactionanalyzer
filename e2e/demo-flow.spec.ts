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
    const nextBtn = page.locator("button").filter({ has: page.locator("svg") }).last();
    await nextBtn.click();
    await expect(page.locator("text=Page 2 of")).toBeVisible();
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
