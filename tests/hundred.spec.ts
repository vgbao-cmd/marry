import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
test("100 guests and overhead labels survive interactions, waitlist, reconnect and churn", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
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
  const state = () => page.request.get("/api/state").then((r) => r.json());
  let initial = await state();
  await page.request.put("/api/config", {
    data: { ...initial.config, max_guests: 100 },
  });
  for (const role of ["bride", "groom"])
    if (!initial.roles[role]) {
      const uid = "hundred-" + role;
      await page.request.post("/api/demo/events", {
        data: {
          id: crypto.randomUUID(),
          type: "join",
          user_id: uid,
          name: role === "bride" ? "Minh Anh" : "Hoàng Nam",
        },
      });
      await page.request.post("/api/control", {
        data: { action: "assign", role, user_id: uid },
      });
    }
  await page
    .getByRole("button", { name: "Tạo đủ 100 khách demo", exact: true })
    .click();
  await expect.poll(async () => (await state()).seated_count).toBe(100);
  const stage = await context.newPage();
  stage.on("pageerror", (e) => errors.push(e.message));
  await stage.setViewportSize({ width: 1080, height: 1920 });
  await stage.goto("/stage?inspect=1");
  const host = stage.locator(".canvas-host");
  await expect(host).toHaveAttribute("data-ready", "true");
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  await expect(host).toHaveAttribute("data-actors", "103");
  await stage.waitForTimeout(2000);
  const before = await state(),
    slots = { ...before.guest_slots },
    uid = Object.keys(slots)[20];
  for (const type of ["comment", "gift"])
    await page.request.post("/api/demo/events", {
      data: {
        id: crypto.randomUUID(),
        type,
        user_id: uid,
        name: "Ngọc Hân 🌸👩🏻‍❤️‍👨🏻 Việt Nam rất dài",
        text: "chúc mừng",
        gift_id: "demo-rose",
        count: 2,
      },
    });
  await expect
    .poll(() => host.getAttribute("data-highlighted"))
    .toContain("user:" + uid);
  expect((await state()).guest_slots).toEqual(slots);
  const highlighted = JSON.parse(
    (await host.getAttribute("data-label-bounds")) || "[]",
  );
  expect(highlighted.length).toBe(103);
  for (const label of highlighted) {
    expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width / 2).toBeLessThanOrEqual(1081);
    expect(label.y).toBeGreaterThanOrEqual(0);
  }
  await stage.screenshot({
    path: "docs/screenshots/hundred-guests-overhead-labels.png",
  });
  const extra = "wait-" + crypto.randomUUID();
  await page.request.post("/api/demo/events", {
    data: {
      id: crypto.randomUUID(),
      type: "join",
      user_id: extra,
      name: "Khách thứ 101 🌸",
    },
  });
  expect((await state()).guest_waiting).toContain(extra);
  expect((await state()).guest_slots).toEqual(slots);
  await expect(host).toHaveAttribute("data-guests", "100");
  await page.getByLabel("Khách rời", { exact: true }).selectOption(uid);
  await page.getByLabel("Khách đang chờ", { exact: true }).selectOption(extra);
  await page
    .getByRole("button", { name: "Thay khách đã chọn", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).guest_slots[extra])
    .toBe(slots[uid]);
  const replaced = await state();
  for (const [id, slot] of Object.entries(slots))
    if (id !== uid) expect(replaced.guest_slots[id]).toBe(slot);
  await page.request.post("/api/control", {
    data: { action: "assign", role: "bride", user_id: extra },
  });
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  const afterRole = await state();
  await page
    .getByRole("button", { name: "Giả lập mất kết nối", exact: true })
    .click();
  await page.getByRole("button", { name: "Kết nối lại", exact: true }).click();
  await expect(page.locator(".connection")).toContainText("Đã đồng bộ");
  await stage.reload();
  await expect(host).toHaveAttribute("data-labels", "103");
  expect((await state()).guest_slots).toEqual(afterRole.guest_slots);
  const session = await context.newCDPSession(stage);
  await session.send("Performance.enable");
  await session.send("HeapProfiler.collectGarbage");
  const heap = async () => {
    const r = await session.send("Performance.getMetrics");
    return r.metrics.find((m: any) => m.name === "JSHeapUsedSize")!.value;
  };
  const heapBefore = await heap();
  const frames = Number(await host.getAttribute("data-texture-frames"));
  for (let batch = 0; batch < 4; batch++) {
    for (let i = 0; i < 10; i++) {
      const s = await state(),
        leaver = Object.keys(s.guest_slots)[i];
      await page.request.post("/api/control", {
        data: { action: "guest_leave", user_id: leaver },
      });
      await expect(host).toHaveAttribute("data-guests", "99");
      await page.request.post("/api/demo/events", {
        data: {
          id: crypto.randomUUID(),
          type: "join",
          user_id: leaver,
          name: s.users[leaver].name,
        },
      });
      await expect(host).toHaveAttribute("data-guests", "100");
    }
    await page.waitForTimeout(150);
  }
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  expect(
    Number(await host.getAttribute("data-pooled-actors")),
  ).toBeLessThanOrEqual(16);
  expect(Number(await host.getAttribute("data-texture-frames"))).toBe(frames);
  await session.send("HeapProfiler.collectGarbage");
  const heapAfter = await heap();
  expect(heapAfter - heapBefore).toBeLessThan(20 * 1024 * 1024);
  const v = (await state()).visuals;
  await page.request.put("/api/visuals", {
    data: { ...v, quality: "low", reduced_effects: true },
  });
  await expect(host).toHaveAttribute("data-ready", "true");
  await expect(host).toHaveAttribute("data-guests", "100");
  await expect(host).toHaveAttribute("data-labels", "103");
  await page.request.put("/api/visuals", { data: v });
  writeFileSync(
    "artifacts/hundred-memory.json",
    JSON.stringify(
      {
        heapBefore,
        heapAfter,
        growth: heapAfter - heapBefore,
        churnPairs: 40,
        guests: 100,
        labels: 103,
        actorPoolLimit: 16,
        textureFrames: frames,
        scope:
          "Chromium JS heap after forced GC, not a GPU/long-duration memory benchmark",
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
