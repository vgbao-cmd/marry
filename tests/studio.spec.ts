import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("studio: events, combo, curtain, reconnect, settings and OBS", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Một tiệc cưới, ngàn lời chúc." }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const password =
    process.env.MARRY_ADMIN_PASSWORD ||
    readFileSync("backend/data/admin-password.txt", "utf8").trim();
  await page.getByPlaceholder("Mật khẩu quản trị").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mời 12 khách" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Mời 12 khách" }).click();
  await page.getByRole("button", { name: "Tặng quà", exact: true }).click();
  await page.getByRole("button", { name: "Nâng ly", exact: true }).click();
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/studio.png", fullPage: true });
  const stage = await context.newPage();
  await stage.setViewportSize({ width: 1080, height: 1920 });
  await stage.goto("/stage");
  await expect(stage.locator("canvas")).toBeVisible();
  await expect(stage.locator(".stage-ribbon")).toBeVisible();
  await stage.screenshot({ path: "artifacts/stage.png", fullPage: true });
  await page.getByRole("button", { name: "Rèm hoa chúc" }).click();
  await expect(
    stage.getByRole("heading", { name: "Động phòng hoa chúc" }),
  ).toBeVisible();
  await expect(stage.locator(".stage-ribbon")).toBeVisible();
  await page.getByRole("button", { name: "Giả lập mất kết nối" }).click();
  await expect(page.locator(".connection")).toContainText("Kết nối lại");
  await page.getByRole("button", { name: "Kết nối lại", exact: true }).click();
  await expect(page.locator(".connection")).toContainText("Đã đồng bộ");
  await page
    .getByRole("button", { name: "Cấu hình tiệc", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu cấu hình" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu cấu hình" }).click();
  await expect(
    page.getByText("Đã lưu cấu hình", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Phòng tiệc", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
});
test("MC fallback is sequential, ducks music and recovers after synthesis errors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.audioTest = { active: 0, max: 0, spoken: 0, failed: 0, targets: [] };
    const original = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, start, constant) {
      w.audioTest.targets.push(value);
      return original.call(this, value, start, constant);
    };
    w.SpeechSynthesisUtterance = class {
      text: string;
      onend: any;
      onerror: any;
      constructor(text: string) {
        this.text = text;
      }
    };
    Object.defineProperty(w, "speechSynthesis", {
      value: {
        getVoices: () => [{ name: "Test Vietnamese", lang: "vi-VN" }],
        speak: (s: any) => {
          w.audioTest.active++;
          w.audioTest.max = Math.max(w.audioTest.max, w.audioTest.active);
          w.audioTest.spoken++;
          setTimeout(() => {
            w.audioTest.active--;
            if (w.audioTest.spoken === 1) {
              w.audioTest.failed++;
              s.onerror?.();
            } else s.onend?.();
          }, 500);
        },
        cancel: () => {
          w.audioTest.active = 0;
        },
      },
    });
  });
  await page.goto("/admin");
  await page
    .getByPlaceholder("Mật khẩu quản trị")
    .fill(
      process.env.MARRY_ADMIN_PASSWORD ||
        readFileSync("backend/data/admin-password.txt", "utf8").trim(),
    );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page
    .getByRole("button", { name: "MC & âm thanh", exact: true })
    .click();
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  await page.request.post("/api/control", { data: { action: "toast" } });
  await page.request.post("/api/control", { data: { action: "dance" } });
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.spoken), {
      timeout: 15000,
    })
    .toBeGreaterThanOrEqual(2);
  const result = await page.evaluate(() => (window as any).audioTest);
  expect(result.max).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.targets.some((x: number) => x > 0 && x < 0.1)).toBeTruthy();
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.targets.at(-1)), {
      timeout: 10000,
    })
    .toBe(0.15);
});
