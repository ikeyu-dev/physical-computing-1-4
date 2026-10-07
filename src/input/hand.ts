import type { Hand, Pose } from "../game/engine";
export type Landmark = { x: number; y: number; z?: number };
const distance = (a: Landmark, b: Landmark) =>
    Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

export function closedHand(points: Landmark[]): boolean {
    if (points.length < 21) return false;
    const folded = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
    ].filter(
        ([tip, joint]) =>
            distance(points[tip], points[0]) <
            distance(points[joint], points[0]) * 1.15,
    ).length;
    return folded >= 3;
}

export function palmPosition(points: Landmark[]) {
    const palm = [0, 5, 9, 13, 17].map((i) => points[i]);
    const x = palm.reduce((v, p) => v + p.x, 0) / palm.length;
    const y = palm.reduce((v, p) => v + p.y, 0) / palm.length;
    // 鏡と同じ左右。中央80%の範囲で画面全体へ届くようにする。
    return {
        x: Math.max(0, Math.min(1, (0.9 - x) / 0.8)) * 1280,
        y: Math.max(0, Math.min(1, (y - 0.1) / 0.8)) * 800,
    };
}

/** 検出の再開時は速度をリセットし、瞬間移動を「驚き」にしない。 */
export class HandFilter {
    private last: (Hand & { time: number }) | null = null;
    private candidate: Pose = "open";
    private count = 0;
    update(position: { x: number; y: number }, pose: Pose, now: number): Hand {
        const old = this.last;
        if (!old || now - old.time > 250) {
            this.count = 0;
            this.last = { ...position, pose, speed: 0, time: now };
        } else {
            const seconds = Math.max((now - old.time) / 1000, 0.001);
            const alpha = 1 - Math.exp(-seconds / 0.055);
            const x = old.x + (position.x - old.x) * alpha;
            const y = old.y + (position.y - old.y) * alpha;
            this.count = pose === this.candidate ? this.count + 1 : 1;
            this.candidate = pose;
            this.last = {
                x,
                y,
                speed: Math.hypot(x - old.x, y - old.y) / seconds,
                pose: this.count >= 3 ? pose : old.pose,
                time: now,
            };
        }
        return this.last;
    }
    reset() {
        this.last = null;
        this.count = 0;
    }
}
