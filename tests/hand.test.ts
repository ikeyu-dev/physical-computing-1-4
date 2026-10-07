import { describe, expect, it } from "vitest";
import {
    closedHand,
    palmPosition,
    HandFilter,
    type Landmark,
} from "../src/input/hand";

describe("手の入力", () => {
    it("手の再出現と長い検出間隔で速度をリセットする", () => {
        const f = new HandFilter();
        f.update({ x: 100, y: 100 }, "open", 0);
        f.reset();
        expect(f.update({ x: 1100, y: 700 }, "open", 100).speed).toBe(0);
        expect(f.update({ x: 50, y: 50 }, "open", 800).speed).toBe(0);
    });
    it("形の切替は3サンプル連続で確認する", () => {
        const f = new HandFilter();
        const p = { x: 300, y: 300 };
        f.update(p, "open", 0);
        expect(f.update(p, "closed", 50).pose).toBe("open");
        expect(f.update(p, "closed", 100).pose).toBe("open");
        expect(f.update(p, "closed", 150).pose).toBe("closed");
    });
    it("指先が手首へ折り込まれているかでグーパーを区別する", () => {
        const p: Landmark[] = Array.from({ length: 21 }, () => ({
            x: 0.5,
            y: 0.5,
        }));
        p[0] = { x: 0.5, y: 0.9 };
        for (const i of [6, 10, 14, 18]) p[i] = { x: 0.5, y: 0.5 };
        for (const i of [8, 12, 16, 20]) p[i] = { x: 0.5, y: 0.2 };
        expect(closedHand(p)).toBe(false);
        for (const i of [8, 12, 16, 20]) p[i] = { x: 0.5, y: 0.75 };
        expect(closedHand(p)).toBe(true);
    });
    it("座標を鏡映しにし、画面の外へ出さない", () => {
        const p = Array.from({ length: 21 }, () => ({ x: 0.2, y: 0.5 }));
        expect(palmPosition(p).x).toBeCloseTo(1120);
        expect(palmPosition(p).y).toBe(400);
    });
});
