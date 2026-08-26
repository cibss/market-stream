import { expect, test } from "@playwright/test";

test.describe("MarketStream terminal", () => {
  test("processes simulated market events end-to-end", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", {
        name: "Simulation",
      })
      .click();

    await page.getByLabel("Simulation rate").selectOption("1000");

    await expect(
      page.getByRole("button", {
        name: "Simulation",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    await expect
      .poll(async () => {
        const text = await page.getByTestId("input-events-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => {
        const text = await page.getByTestId("ui-commits-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBeGreaterThan(0);
  });

  test("can switch processing to a Web Worker under simulated load", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", {
        name: "Simulation",
      })
      .click();

    await page.getByLabel("Simulation rate").selectOption("5000");

    await page
      .getByRole("button", {
        name: "Web Worker",
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Web Worker",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    await expect
      .poll(async () => {
        const text = await page.getByTestId("input-events-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBeGreaterThan(1_000);
  });

  test("can pause and resume the simulated stream", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", {
        name: "Simulation",
      })
      .click();

    await page.getByLabel("Simulation rate").selectOption("1000");

    await expect
      .poll(async () => {
        const text = await page.getByTestId("input-events-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBeGreaterThan(0);

    await page
      .getByRole("button", {
        name: "Pause Stream",
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Resume Stream",
      }),
    ).toBeVisible();

    /**
     * Metrics are emitted once per second,
     * so wait until the next metrics window
     * reports zero input events.
     */
    await expect
      .poll(async () => {
        const text = await page.getByTestId("input-events-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBe(0);

    await page
      .getByRole("button", {
        name: "Resume Stream",
      })
      .click();

    await expect
      .poll(async () => {
        const text = await page.getByTestId("input-events-per-second").textContent();

        return Number(text ?? 0);
      })
      .toBeGreaterThan(0);
  });
});
