import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("photographic stage, 30 guests, gift, fabric curtain and asset upload", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin");
  await page
    .getByPlaceholder("Mật khẩu quản trị")
    .fill(
      process.env.MARRY_ADMIN_PASSWORD ||
        readFileSync("backend/data/admin-password.txt", "utf8").trim(),
    );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const baseline = await page.request.get("/api/state").then((r) => r.json());
  await page.request.put("/api/config", {
    data: { ...baseline.config, max_guests: 6 },
  });
  const stage = await context.newPage();
  const stageErrors: string[] = [];
  stage.on("pageerror", (e) => stageErrors.push(e.message));
  await stage.setViewportSize({ width: 1080, height: 1920 });
  const requests: string[] = [];
  stage.on("request", (r) => {
    if (r.url().includes("/assets/wedding/")) requests.push(r.url());
  });
  await stage.goto("/stage");
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await stage.waitForTimeout(1800);
  await stage.screenshot({ path: "docs/screenshots/photographic-couple.png" });
  await page.request.put("/api/config", { data: baseline.config });
  await page.getByRole("button", { name: "Mời 30 khách", exact: true }).click();
  await page.request.post("/api/demo/events", {
    data: {
      id: crypto.randomUUID(),
      type: "join",
      user_id: "mc",
      name: "Khách tên MC",
    },
  });
  await expect
    .poll(() => stage.locator(".canvas-host").getAttribute("data-guests"))
    .toMatch(/^(?:[3-9][0-9]|100)$/);
  await stage.waitForTimeout(1800);

  await stage.screenshot({
    path: "docs/screenshots/photographic-30-guests.png",
  });
  expect(
    Number(await stage.locator(".canvas-host").getAttribute("data-actors")),
  ).toBe(
    Number(await stage.locator(".canvas-host").getAttribute("data-guests")) + 3,
  );
  const loaded = requests.length;
  await page.request.post("/api/demo/events", {
    data: {
      id: crypto.randomUUID(),
      type: "gift",
      user_id: "photo-test",
      name: "Ngọc Hân",
      gift_id: "demo-rose",
      count: 15,
    },
  });
  await expect(stage.locator(".photo-event")).toBeVisible();
  await page.request.post("/api/control", { data: { action: "fireworks" } });
  await stage.waitForTimeout(450);
  await stage.screenshot({ path: "docs/screenshots/photographic-gift.png" });
  expect(requests.length).toBe(loaded);
  const cap = baseline.visuals.reduced_effects
    ? 18
    : baseline.visuals.quality === "low"
      ? 35
      : baseline.visuals.quality === "high"
        ? 160
        : 85;
  expect(
    Number(await stage.locator(".canvas-host").getAttribute("data-particles")),
  ).toBeLessThanOrEqual(cap);
  await page.getByRole("button", { name: "Rèm hoa chúc", exact: true }).click();
  await expect(stage.locator(".photo-curtain")).toBeVisible();
  await expect(stage.locator(".stage-ribbon")).toBeVisible();
  await stage.waitForTimeout(1200);
  await stage.screenshot({ path: "docs/screenshots/photographic-curtain.png" });
  await page
    .getByRole("button", { name: "Hình ảnh & nhân vật", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hình ảnh & nhân vật", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tôi có quyền sử dụng ảnh tải lên").check();
  const encoded = await page.evaluate(async () => {
    const i = new Image();
    i.src = "/assets/wedding/principals.webp";
    await i.decode();
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 1024;
    c.getContext("2d")!.drawImage(i, 70, 0, 400, 1024, 0, 0, 400, 1024);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Tải ảnh nhân vật").setInputFiles({
    name: "mc-fictional.png",
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  });
  await expect(
    page.getByText("Đã tải ảnh. Kiểm tra chân rồi bấm Lưu hình ảnh."),
  ).toBeVisible();
  await page.getByLabel("Lệch ngang", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Lưu hình ảnh", exact: true }).click();
  await expect(
    page.getByText("Đã lưu hình ảnh; sân khấu đã đồng bộ."),
  ).toBeVisible();
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/photographic-admin-assets.png",
    fullPage: true,
  });
  const saved = await page.request.get("/api/state").then((r) => r.json());
  expect(saved.visuals.characters.mc.url).toMatch(/^\/media\/.*\.webp$/);
  expect(saved.visuals.characters.mc.offset_x).toBe(8);
  await stage.reload();
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(
    (await stage.request.get("/api/state").then((r) => r.json())).visuals
      .characters.mc.url,
  ).toBe(saved.visuals.characters.mc.url);
  // Restore stock asset references so clone users do not depend on this test's local media.
  await page.request.put("/api/visuals", { data: baseline.visuals });
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const low = { ...baseline.visuals, quality: "low", reduced_effects: true };
  await page.request.put("/api/visuals", { data: low });
  await expect(stage.locator(".stage")).toHaveClass(/quality-low/);
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.request.post("/api/control", { data: { action: "fireworks" } });
  await stage.waitForTimeout(250);
  expect(
    Number(await stage.locator(".canvas-host").getAttribute("data-particles")),
  ).toBeLessThanOrEqual(18);
  expect(await stage.locator("canvas").getAttribute("width")).toBe("702");
  await page.request.put("/api/visuals", { data: baseline.visuals });
  await expect(stage.locator(".canvas-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(errors).toEqual([]);
  expect(stageErrors).toEqual([]);
});
