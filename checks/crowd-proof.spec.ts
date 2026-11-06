import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
test("alpha anchored labels and staggered crowd at 30, 60 and 100", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect(
    (
      await page.request.post("/api/login", {
        data: { password: "proof-local-password" },
      })
    ).ok(),
  ).toBeTruthy();
  const state = () => page.request.get("/api/state").then((r) => r.json());
  let previous: Record<string, number> = {};
  const measurements: any[] = [];
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/stage?inspect=1");
  const host = page.locator(".canvas-host");
  await expect(host).toHaveAttribute("data-ready", "true");
  for (const count of [30, 60, 100]) {
    const s = await state();
    expect(
      (
        await page.request.put("/api/config", {
          data: { ...s.config, max_guests: count },
        })
      ).ok(),
    ).toBeTruthy();
    await page.request.post("/api/demo/fill");
    await page.request.post("/api/demo/names");
    await expect(host).toHaveAttribute("data-guests", String(count));
    await expect(host).toHaveAttribute("data-labels", String(count + 3));
    await page.waitForTimeout(1600);
    const current = await state();
    for (const [id, slot] of Object.entries(previous))
      expect(current.guest_slots[id]).toBe(slot);
    previous = { ...current.guest_slots };
    const labels = JSON.parse((await host.getAttribute("data-label-bounds"))!);
    expect(labels).toHaveLength(count + 3);
    const guests = labels.filter((x: any) => !x.role);
    expect(guests.every((x: any) => Math.abs(x.gap - 6) < 0.01)).toBeTruthy();
    for (const label of labels) {
      expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width / 2).toBeLessThanOrEqual(1081);
      expect(label.y).toBeGreaterThanOrEqual(0);
    }
    const heights = guests.map((x: any) => x.bodyHeight);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(135);
    expect(Math.max(...heights)).toBeLessThanOrEqual(225);
    expect(Math.max(...heights)).toBeGreaterThan(195);
    expect(new Set(guests.map((x: any) => x.text)).size).toBeGreaterThan(
      count * 0.9,
    );
    await page.screenshot({
      path: `docs/screenshots/crowd-v2-${count}-full.png`,
    });
    await page.screenshot({
      path: `docs/screenshots/crowd-v2-${count}-close.png`,
      clip: { x: 25, y: 940, width: 540, height: 690 },
    });
    measurements.push({
      count,
      heights: { min: Math.min(...heights), max: Math.max(...heights) },
      maxGapError: Math.max(...guests.map((x: any) => Math.abs(x.gap - 6))),
      labelCount: labels.length,
      labels,
    });
  }
  const before = await state(),
    id = Object.keys(before.guest_slots)[22],
    cached = await host.getAttribute("data-alpha-frames");
  await page.request.post("/api/demo/events", {
    data: {
      id: crypto.randomUUID(),
      type: "comment",
      user_id: id,
      name: "Ngọc Hân 🌸",
      text: "chúc mừng",
    },
  });
  await expect
    .poll(() => host.getAttribute("data-highlighted"))
    .toContain("user:" + id);
  expect((await state()).guest_slots).toEqual(before.guest_slots);
  expect(await host.getAttribute("data-alpha-frames")).toBe(cached);
  // Capture the live DOM insertion inside the page, before a short-lived node
  // can be replaced or expire while a remote locator handle is being resolved.
  await page.evaluate(() => {
    const w = window as any;
    w.noticeMeasurement = null;
    const observer = new MutationObserver(() => {
      const el = document.querySelector(".photo-event");
      if (!el?.textContent?.includes("Cùng nâng ly")) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        w.noticeMeasurement = {
          connected: el.isConnected,
          y: rect.y,
          height: rect.height,
          width: rect.width,
        };
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.request.post("/api/control", { data: { action: "toast" } });
  await expect
    .poll(() => page.evaluate(() => (window as any).noticeMeasurement), {
      timeout: 7000,
    })
    .toMatchObject({ connected: true });
  const notice = await page.evaluate(() => (window as any).noticeMeasurement);
  expect(notice.height).toBeGreaterThan(20);
  expect(notice.width).toBeGreaterThan(100);
  expect(notice.y + notice.height).toBeLessThan(500);
  await expect(page.locator(".photo-event")).toHaveCount(0, { timeout: 6500 });
  // Add 300px transparent top padding to a real guest frame. No head-position constant can pass this test.
  const original = (await state()).visuals;
  const png = await page.evaluate(async () => {
    const im = new Image();
    im.src = "/assets/wedding/guests.webp";
    await im.decode();
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 812;
    c.getContext("2d")!.drawImage(im, 0, 0, 384, 512, 0, 300, 384, 512);
    return c.toDataURL("image/png").split(",")[1];
  });
  const upload = await page.request.post("/api/assets", {
    multipart: {
      rights: "true",
      file: {
        name: "padded-guest.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const asset = await upload.json();
  const v = structuredClone(original);
  v.characters["guest-1"] = {
    ...v.characters["guest-1"],
    url: asset.url,
    frames: [],
    foot_y: (300 + 512 * 0.98) / 812,
    head_x: null,
    head_y: null,
  };
  expect(
    (await page.request.put("/api/visuals", { data: v })).ok(),
  ).toBeTruthy();
  await expect(host).toHaveAttribute("data-ready", "true");
  // Wait for this exact uploaded asset, not a ready flag left by the old scene.
  const paddedLabels = async () =>
    JSON.parse((await host.getAttribute("data-label-bounds")) || "[]").filter(
      (x: any) => x.asset === asset.url,
    );
  await expect
    .poll(async () => (await paddedLabels()).length, { timeout: 15000 })
    .toBeGreaterThan(0);
  const padded = await paddedLabels();
  expect(errors).toEqual([]);
  expect(
    padded.every((x: any) => x.alphaTop >= 300 && Math.abs(x.gap - 6) < 0.01),
  ).toBeTruthy();
  await page.screenshot({
    path: "docs/screenshots/crowd-v2-padded-alpha-close.png",
    clip: { x: 25, y: 940, width: 540, height: 690 },
  });
  await page.request.put("/api/visuals", { data: original });
  await page.reload();
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  expect((await state()).guest_slots).toEqual(before.guest_slots);
  await page.request.put("/api/visuals", {
    data: { ...original, quality: "low", reduced_effects: true },
  });
  await expect(host).toHaveAttribute("data-ready", "true");
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  writeFileSync(
    "docs/crowd-v2-measurements.json",
    JSON.stringify(
      {
        alphaThreshold: 32,
        paddingTest: {
          pixels: 300,
          matched: padded.length,
          maxGapError: Math.max(...padded.map((x: any) => Math.abs(x.gap - 6))),
        },
        measurements,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
