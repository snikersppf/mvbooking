import { expect, test } from "@playwright/test";

for (const [start, end] of [["2026-11-25", "2026-12-10"], ["2026-12-25", "2027-01-10"]]) {
  test(`range fill follows dates from ${start} to ${end} in 500ms without overlapping cells`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-11-04T10:00:00.000Z"));
    await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
    await page.goto("/");
    await page.locator("#home-start-date").click();
    const calendar = page.getByRole("dialog", { name: "Choose dates", exact: true });
    if (end.startsWith("2027")) await calendar.getByRole("button", { name: "Next month", exact: true }).filter({ visible: true }).click();
    const first = calendar.locator(`[data-date="${start}"]`);
    const last = calendar.locator(`[data-date="${end}"]`);
    await first.click();
    expect(await first.locator('[data-selected="true"]').evaluate((el) => getComputedStyle(el, "::before").backgroundImage)).toBe("none");
    await last.click();
    await expect(calendar).toHaveAttribute("data-range-complete", "true");
    const bands = calendar.locator('[data-range-band="true"]');
    // Inspect the rendered animation at a shared instant, independently of machine speed.
    const frames = await bands.evaluateAll((elements) => elements.map((element) => {
      const animation = element.getAnimations()[0];
      animation.pause();
      animation.currentTime = 200;
      const timing = animation.effect!.getTiming();
      return { date: element.closest("[data-date]")!.getAttribute("data-date")!, delay: timing.delay ?? 0, duration: Number(timing.duration), progress: animation.effect!.getComputedTiming().progress! };
    }));
    expect(frames[0].date).toBe(start);
    expect(frames[frames.length - 1].date).toBe(end);
    expect(frames[0].delay).toBe(0);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].date).toBe(new Date(Date.parse(`${frames[i - 1].date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10));
      expect(frames[i].delay).toBeCloseTo(frames[i - 1].delay + frames[i - 1].duration, 5);
    }
    expect(frames[frames.length - 1].delay + frames[frames.length - 1].duration).toBeCloseTo(500, 5);
    expect(frames.filter((frame) => frame.progress > 0 && frame.progress < 1)).toHaveLength(1);
    const active = frames.findIndex((frame) => frame.progress > 0 && frame.progress < 1);
    expect(frames.slice(0, active).every((frame) => frame.progress === 1)).toBe(true);
    expect(frames.slice(active + 1).every((frame) => frame.progress === 0)).toBe(true);
    expect(await first.locator('[data-selected="true"]').evaluate((el) => getComputedStyle(el, "::before").backgroundImage)).toContain("at 18%");
    expect(await last.locator('[data-selected="true"]').evaluate((el) => getComputedStyle(el, "::before").backgroundImage)).toContain("at 82%");
    const finished = await bands.evaluateAll((elements) => elements.map((element) => {
      const animation = element.getAnimations()[0];
      animation.currentTime = 500;
      return animation.effect!.getComputedTiming().progress;
    }));
    expect(finished.every((progress) => progress === 1)).toBe(true);
  });
}

for (const width of [1440, 390, 320]) {
  test(`homepage calendar opens with the first click on either field at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 640 ? 768 : 844 });
    for (const field of ["start", "end"]) {
      await page.goto("/");
      await page.locator(`#home-${field}-date`).click();
      const calendar = page.getByRole("dialog");
      await expect(calendar).toBeInViewport();
      await expect(calendar).toHaveCSS("transform", "none");
      await page.setViewportSize({ width, height: width > 640 ? 700 : 720 });
      await expect(calendar).toBeInViewport();
      await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
      await expect(calendar).toBeInViewport();
      await page.keyboard.press("Escape");
      await expect(calendar).toBeHidden();
    }
  });
}

test("range weeks have rounded ends and softly blended selection markers", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-11-04T10:00:00.000Z"));
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
  await page.goto("/");
  await page.locator("#home-start-date").click();
  const calendar = page.getByRole("dialog");
  await calendar.locator('[data-date="2026-11-02"]').click();
  await calendar.locator('[data-date="2026-11-21"]').click();
  expect(await calendar.locator('[data-range-row-start="true"]').evaluateAll((elements) => elements.map((el) => el.getAttribute("data-date")))).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
  expect(await calendar.locator('[data-range-row-end="true"]').evaluateAll((elements) => elements.map((el) => el.getAttribute("data-date")))).toEqual(["2026-11-08", "2026-11-15", "2026-11-21"]);
  await expect(calendar.locator('[data-date="2026-11-09"] [data-range-band]')).toHaveCSS("border-top-left-radius", "999px");
  await expect(calendar.locator('[data-date="2026-11-15"] [data-range-band]')).toHaveCSS("border-top-right-radius", "999px");
});

for (const width of [1440, 390, 320]) {
  test(`shared rental calendar at ${width}px selects and animates a range without moving between inputs`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-11-04T10:00:00.000Z"));
    await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
    await page.goto("/");
    const pickup = page.locator("#home-start-date");
    const returned = page.locator("#home-end-date");
    const calendar = page.getByRole("dialog", { name: "Choose dates", exact: true });
    const search = page.locator('form[action="/vehicles"]');
    const values = () => search.evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement)));
    await search.locator('[data-with-time="true"]').scrollIntoViewIfNeeded();
    await pickup.click();
    await expect(calendar).toHaveCSS("transform", "none");
    const position = await calendar.boundingBox();
    expect(position!.x).toBeGreaterThanOrEqual(0);
    expect(position!.x + position!.width).toBeLessThanOrEqual(width);
    await expect(calendar.locator("section")).toHaveCount(2);
    await expect(returned).toHaveAttribute("aria-controls", (await pickup.getAttribute("aria-controls"))!);
    await expect(calendar.getByRole("heading").first()).toContainText("November 2026");
    await expect(calendar.getByRole("heading").last()).toContainText("December 2026");
    await page.keyboard.press("Escape");
    await expect(pickup).toBeFocused();
    await returned.click();
    await expect(calendar).toHaveCSS("transform", "none");
    const returnPosition = await calendar.boundingBox();
    expect(returnPosition!.x).toBeCloseTo(position!.x, 0);
    expect(returnPosition!.y).toBeCloseTo(position!.y, 0);

    const firstDay = calendar.locator('[data-date="2026-11-22"]');
    await firstDay.click();
    await expect(calendar).toBeVisible();
    await expect(returned).toHaveAttribute("data-active", "true");
    await expect(pickup).toHaveAttribute("data-date-value", "2026-11-22");
    expect(await firstDay.locator('[data-selected="true"]').evaluate((el) => getComputedStyle(el, "::before").animationDuration)).toBe("0.3s");
    await calendar.locator('[data-date="2026-12-14"]').click();
    await expect(calendar).toBeVisible();
    await expect(calendar.locator('[data-in-range="true"]')).toHaveCount(23);
    await expect(calendar.locator('[data-date="2026-11-30"]')).toHaveAttribute("data-in-range", "true");
    const bands = calendar.locator('[data-range-band="true"][data-animate="true"]');
    const delays = await bands.evaluateAll((elements) => elements.map((el) => parseFloat((el as HTMLElement).style.animationDelay)));
    expect(delays[delays.length - 1]).toBeGreaterThan(delays[0]);
    await calendar.getByRole("button", { name: "Done", exact: true }).click();
    await expect(calendar).toBeHidden();
    await page.getByLabel("Pickup time", { exact: true }).fill("14:30");
    await page.getByLabel("Return time", { exact: true }).fill("15:45");
    expect(await values()).toMatchObject({ startDate: "2026-11-22T10:30:00.000Z", endDate: "2026-12-14T11:45:00.000Z" });

    await pickup.click();
    await page.keyboard.press("ArrowRight");
    await expect(calendar.locator('[data-date="2026-11-23"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    expect(await values()).toMatchObject({ startDate: "2026-11-23T10:30:00.000Z", endDate: "2026-11-24T11:45:00.000Z" });
    await page.keyboard.press("Escape");
    await pickup.click();
    await page.mouse.wheel(0, 300);
    await expect(calendar).toBeHidden();
    await returned.click();
    await calendar.getByRole("button", { name: "Clear dates", exact: true }).click();
    expect(await values()).toMatchObject({ startDate: "", endDate: "" });
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("range animations respect reduced motion", async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-11-04T10:00:00.000Z"));
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
  await page.goto("/");
  await page.locator("#home-start-date").click();
  const calendar = page.getByRole("dialog", { name: "Choose dates", exact: true });
  await calendar.locator('[data-date="2026-11-22"]').click();
  await calendar.locator('[data-date="2026-12-14"]').click();
  expect(await calendar.locator('[data-date="2026-11-22"] [data-selected="true"]').evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("none");
  expect(await calendar.locator('[data-date="2026-11-30"] > [data-animate="true"]').evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});
