import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const destinations = [
  { href: "/", link: "مرکز اقدام", heading: "مرکز اقدام" },
  { href: "/growth", link: "رشد", heading: "رشد و فرصت‌ها" },
  {
    href: "/reliability",
    link: "پایداری پرداخت",
    heading: "پایداری پرداخت",
  },
  {
    href: "/evidence",
    link: "شواهد و تحلیل‌گر",
    heading: "شواهد و تحلیل‌گر",
  },
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const shell = page.getByTestId("app-shell");
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute("data-hydrated", "true");
});

test("رابط فارسی و راست‌به‌چپ با مسیر حیاتی پرداخت نمایش داده می‌شود", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("lang", /^fa(?:-|$)/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "مرکز اقدام" })).toBeVisible();
  await expect(page.getByTestId("lifecycle-pulse")).toBeVisible();
  await expect(page.getByTestId("chart-table-alternative").first()).toBeAttached();
});

test("هر چهار مقصد اصلی از ناوبری قابل دسترس است", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [index, destination] of destinations.entries()) {
    await test.step(destination.heading, async () => {
      await page.getByRole("link", { name: destination.link, exact: true }).first().click();
      await expect(page).toHaveURL((url) => url.pathname === destination.href);
      await expect(
        page.getByRole("heading", { level: 1, name: destination.heading }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("حالت داده محدود است", { exact: true })).toBeVisible();
      if (index < destinations.length - 1) {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("app-shell")).toHaveAttribute(
          "data-hydrated",
          "true",
        );
      }
    });
  }
});

test("جزئیات محاسبه از خود بینش قابل بازرسی است", async ({ page }, testInfo) => {
  const evidenceButton = page
    .getByRole("button", { name: "چگونه محاسبه شد؟", exact: true })
    .first();
  await expect(evidenceButton).toHaveAttribute("data-hydrated", "true");
  await evidenceButton.click();
  await expect(page.getByTestId("evidence-sheet")).toBeVisible();
  await expect(page.getByText(/فرمول|تعریف شاخص/).first()).toBeVisible();

  if (testInfo.project.name === "mobile-390") {
    await expect(page.getByRole("heading", { name: "ردیف‌های منبع" })).toBeVisible();
    await expect(page.getByTestId("evidence-record-card").first()).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "صفحه بعدی ردیف‌ها" })).toBeVisible();
  await page.getByRole("button", { name: "صفحه بعدی ردیف‌ها" }).click();
  await expect(page.getByText(/صفحه ۲ از/)).toBeVisible();
});

test("هر نمودار یک جدول داده قابل نمایش دارد", async ({ page }) => {
  await expect(page.getByTestId("chart-panel").first()).toHaveAttribute(
    "data-hydrated",
    "true",
  );
  await page.getByRole("button", { name: "نمایش جدول داده‌ها" }).first().click();
  await expect(page.getByTestId("chart-table-alternative").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "پنهان‌کردن جدول داده‌ها" }).first(),
  ).toBeVisible();
});

test("صفحه اصلی خطای دسترس‌پذیری جدی یا بحرانی ندارد", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(blocking).toEqual([]);
});

test("تحلیل‌گر بدون کلید خارجی پاسخ قطعی و منبع‌دار می‌دهد", async ({ page }) => {
  await page.goto("/evidence", { waitUntil: "domcontentloaded" });
  const analyst = page.getByTestId("ai-analyst");
  await expect(analyst).toBeVisible();
  await expect(analyst).toHaveAttribute("data-hydrated", "true");

  const prompt = page.getByRole("textbox", { name: "پرسش از تحلیل‌گر" });
  await prompt.fill("مهم‌ترین اقدام بعدی چیست؟");
  await expect(prompt).toBeFocused();
  await expect(prompt).toBeInViewport();
  await page.getByRole("button", { name: "ارسال پرسش", exact: true }).click();

  const answer = page.getByTestId("ai-fallback");
  await expect(answer).toContainText("پاسخ قطعی بر پایه شواهد ثبت‌شده", {
    timeout: 20_000,
  });
  await expect(answer).toContainText(/verified_session_rate|rescued_sessions/);
});

test("تحلیل‌گر ساختار پیام خراب را با ۴۰۰ رد می‌کند", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The API validation check runs once.");
  const response = await request.post("/api/chat", {
    data: {
      from: "2026-01-01",
      merchant_key: "M43",
      messages: [{}],
      to: "2026-02-28",
    },
  });
  expect(response.status()).toBe(400);
});

test("فیلتر بازه در URL ثبت می‌شود و میان مقصدها باقی می‌ماند", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile-390") {
    await page.getByRole("button", { name: "فیلترها", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "فیلترها" })).toBeVisible();
  }

  await page
    .getByRole("combobox", { name: "بازه تحلیل" })
    .filter({ visible: true })
    .click();
  await page.getByRole("option", { name: "۳۰ روز پایانی" }).click();
  await page.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  await expect(page).toHaveURL((url) => {
    return (
      url.searchParams.get("merchant_key") === "M43" &&
      url.searchParams.get("from") === "2026-01-30" &&
      url.searchParams.get("to") === "2026-02-28"
    );
  });

  await page.getByRole("link", { name: "رشد", exact: true }).first().click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/growth" &&
      url.searchParams.get("from") === "2026-01-30" &&
      url.searchParams.get("to") === "2026-02-28"
    );
  });
});

test("پوسته دسکتاپ و موبایل فقط ناوبری مناسب همان نما را نشان می‌دهد", async ({
  page,
}, testInfo) => {
  const desktop = testInfo.project.name === "desktop-1440";
  if (desktop) {
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();
  } else {
    await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
  }

  if (!desktop) {
    await page.getByRole("button", { name: "فیلترها", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "فیلترها" })).toBeVisible();
  }
});
