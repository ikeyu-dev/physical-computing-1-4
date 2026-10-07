import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
    ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
    await page.goto("http://127.0.0.1:5173");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: "test-results/setup.png" });
    await page.getByRole("button", { name: "マウスでためす" }).click();
    await page.screenshot({ path: "test-results/waiting.png" });
    await page.waitForFunction(
        () => Number(document.querySelector(".scene").dataset.reveal) > 0.64,
    );
    await page.screenshot({ path: "test-results/peek.png" });
    await page.mouse.move(625, 455);
    await page.waitForFunction(
        () => Number(document.querySelector(".scene").dataset.reveal) > 0.98,
    );
    await page.mouse.move(655, 455, { steps: 20 });
    await page.mouse.down();
    await page.waitForFunction(
        () =>
            document
                .querySelector('[data-testid="hand"]')
                ?.getAttribute("data-pose") === "closed",
    );
    await page.screenshot({ path: "test-results/closed.png" });
    await page.mouse.up();
    await page.waitForFunction(
        () =>
            document
                .querySelector('[data-testid="hand"]')
                ?.getAttribute("data-pose") === "open",
    );
    await page.screenshot({ path: "test-results/open.png" });
    for (let i = 0; i < 12; i++) {
        await page.mouse.move(i % 2 ? 760 : 490, 470);
        await page.waitForTimeout(25);
    }
    await page.waitForFunction(
        () => document.querySelector(".scene").dataset.phase === "startled",
    );
    await page.screenshot({ path: "test-results/startled.png" });
    await page.waitForFunction(
        () => document.querySelector(".scene").dataset.phase === "active",
    );
    await page.mouse.move(1279, 799);
    await page.mouse.move(1281, 801);
    await page.waitForFunction(
        () => document.querySelector(".scene").dataset.phase === "sleeping",
        null,
        { timeout: 40000 },
    );
    await page.waitForFunction(
        () => document.querySelector(".scene").dataset.reveal === "0.00",
    );
    await page.waitForTimeout(800);
    await page.screenshot({ path: "test-results/sleeping.png" });
    await page.waitForTimeout(5500);
    await page.mouse.move(640, 455);
    await page.waitForFunction(
        () => document.querySelector(".scene").dataset.phase === "active",
    );
    assert.ok(
        Number(await page.locator(".scene").getAttribute("data-comfort")) < 5,
    );
    await page.keyboard.press("Escape");
    await page
        .getByRole("button", { name: "カメラを使って、会ってみる" })
        .click();
    await page.waitForFunction(() => !document.querySelector(".setup"), null, {
        timeout: 60000,
    });
    assert.equal(
        await page
            .locator("video")
            .evaluate((v) => v.srcObject.getVideoTracks()[0].readyState),
        "live",
    );
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test-results/camera.png" });
    await page.keyboard.press("Escape");
    assert.equal(
        await page.locator("video").evaluate((v) => v.srcObject),
        null,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/narrow.png" });
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException("Denied", "NotAllowedError");
        };
    });
    await page
        .getByRole("button", { name: "カメラを使って、会ってみる" })
        .click();
    await page.getByRole("alert").waitFor();
    assert.equal(
        await page.locator("video").evaluate((v) => v.srcObject),
        null,
    );
    await page.getByRole("button", { name: "マウスでためす" }).click();
    assert.equal(await page.locator(".setup").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
        "PASS: mouse open/closed, startle/recovery, absence sleep/restart, fake camera + real model initialization, track cleanup, permission denial fallback, narrow viewport, no page errors.",
    );
} finally {
    await browser.close();
}
