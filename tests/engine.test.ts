import { describe, expect, it } from "vitest";
import { initialState, step, type Hand, type State } from "../src/game/engine";
import { CONFIG } from "../src/game/config";

const gentle: Hand = { x: 625, y: 455, speed: 100, pose: "open" };
function run(s: State, hand: Hand | null, seconds: number) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) s = step(s, hand, 1 / 60);
    return s;
}
describe("こもりの体験", () => {
    it("待機は完全に隠れ、ときどき覗いてから戻る", () => {
        let s = run(initialState(), null, 4);
        expect(s.reveal).toBe(0);
        s = run(s, null, 2.8);
        expect(s.reveal).toBeGreaterThan(0.6);
        s = run(s, null, 2);
        expect(s.reveal).toBe(0);
        expect(s.phase).toBe("waiting");
    });
    it("静止した手を放置と誤判定しない", () => {
        const s = run(initialState(), { ...gentle, speed: 0 }, 40);
        expect(s.phase).toBe("active");
        expect(s.reveal).toBe(1);
        expect(s.absence).toBe(0);
    });
    it("グーとパーで同じように慣れる", () => {
        const open = run(initialState(), gentle, 8);
        const closed = run(initialState(), { ...gentle, pose: "closed" }, 8);
        expect(open.comfort).toBe(closed.comfort);
        expect(open.comfort).toBeGreaterThan(30);
    });
    it("速い動きで隠れ、静かに待つと戻る", () => {
        let s = run(initialState(), gentle, 4);
        const before = s.comfort;
        s = run(s, { ...gentle, speed: 1800 }, 0.5);
        expect(s.phase).toBe("startled");
        expect(s.reveal).toBe(0);
        expect(s.comfort).toBeLessThan(before);
        s = run(s, { ...gentle, speed: 0 }, 4);
        expect(s.phase).toBe("active");
        expect(s.reveal).toBeGreaterThan(0.9);
    });
    it("一瞬手が消えても好感度や姿勢をリセットしない", () => {
        const before = run(initialState(), gentle, 4);
        const s = run(before, null, 0.3);
        expect(s.comfort).toBe(before.comfort);
        expect(s.reveal).toBe(before.reveal);
    });
    it("不在が続くと殻へ戻って眠る", () => {
        let s = run(initialState(), gentle, 3);
        s = run(s, null, CONFIG.retreatAfter + 2);
        expect(s.reveal).toBe(0);
        expect(s.phase).toBe("active");
        s = run(s, null, 20);
        expect(s.phase).toBe("sleeping");
        expect(s.reveal).toBe(0);
    });
    it("MAX後N秒で殻に眠り、手が残っていても再開しない", () => {
        let s = run(initialState(), gentle, 16);
        expect(s.fullTime).not.toBeNull();
        s = run(s, gentle, CONFIG.sleepAfterMax + 3);
        expect(s.phase).toBe("sleeping");
        expect(s.reveal).toBe(0);
        s = run(s, gentle, 20);
        expect(s.phase).toBe("sleeping");
        s = run(s, null, CONFIG.rearmAbsence + 0.1);
        s = step(s, gentle, 1 / 60);
        expect(s.phase).toBe("active");
        expect(s.comfort).toBe(0);
        expect(s.fullTime).toBeNull();
    });
    it("MAX到達後に驚いても終了カウントを取り消さない", () => {
        let s = run(initialState(), gentle, 16);
        s = run(s, { ...gentle, speed: 1800 }, 0.5);
        expect(s.comfort).toBeLessThan(100);
        expect(s.fullTime).not.toBeNull();
        s = run(s, gentle, 24);
        expect(s.phase).toBe("sleeping");
    });
});
