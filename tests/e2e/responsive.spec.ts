import { expect, test } from "@playwright/test";

const supportedWidths = [320, 360, 768, 1024, 1366, 1920] as const;

test("پوسته در عرض‌های پشتیبانی‌شده سرریز افقی ندارد", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The width matrix runs once.");

  for (const width of supportedWidths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const shell = page.getByTestId("app-shell");
      await expect(shell).toBeVisible();
      await expect(shell).toHaveAttribute("data-hydrated", "true");
      await expect(page.getByRole("main")).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    });
  }
});

test("در زوم ۲۰۰ درصد، محتوا و اقدام‌های اصلی قابل استفاده می‌مانند", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Zoom coverage runs once.");

  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("app-shell")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { level: 1, name: "مرکز اقدام" })).toBeVisible();
  await expect(page.getByRole("button", { name: "فیلترها", exact: true })).toBeVisible();
});

test("ترجیح کاهش حرکت رعایت می‌شود", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Motion coverage runs once.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("app-shell")).toHaveAttribute("data-hydrated", "true");

  const longestMotionMs = await page
    .getByTestId("lifecycle-pulse")
    .evaluate((root) => {
      const toMs = (value: string) =>
        value
          .split(",")
          .map((part) => part.trim())
          .map((part) =>
            part.endsWith("ms")
              ? Number.parseFloat(part)
              : Number.parseFloat(part) * 1_000,
          )
          .filter(Number.isFinite);

      return Math.max(
        0,
        ...Array.from(root.querySelectorAll("*")).flatMap((element) => {
          const style = getComputedStyle(element);
          return [...toMs(style.animationDuration), ...toMs(style.transitionDuration)];
        }),
      );
    });
  expect(longestMotionMs).toBeLessThanOrEqual(10);
});
