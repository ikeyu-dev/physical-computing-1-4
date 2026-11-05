import { CONFIG, HEAD, NEAR } from "./config";

export type Pose = "open" | "closed";
export type Point = { x: number; y: number };
export type Hand = {
    x: number;
    y: number;
    speed: number;
    pose: Pose;
    contactPoints?: Point[];
};
export type Phase = "waiting" | "active" | "startled" | "drowsy" | "sleeping";
export type State = {
    phase: Phase;
    clock: number;
    phaseTime: number;
    comfort: number;
    absence: number;
    calm: number;
    fast: number;
    fullTime: number | null;
    reveal: number;
    stroking: boolean;
    rearmed: boolean;
    interactionTime: number;
};

export const initialState = (): State => ({
    phase: "waiting",
    clock: 0,
    phaseTime: 0,
    comfort: 0,
    absence: 0,
    calm: 0,
    fast: 0,
    fullTime: null,
    reveal: 0,
    stroking: false,
    rearmed: false,
    interactionTime: 0,
});

function inside(hand: Point, area: typeof HEAD) {
    return (
        ((hand.x - area.x) / area.rx) ** 2 +
            ((hand.y - area.y) / area.ry) ** 2 <=
        1
    );
}

function contactStrength(hand: Hand, area: typeof HEAD) {
    const points = [hand, ...(hand.contactPoints ?? [])];
    let strength = 0;
    for (const point of points) {
        const distance = Math.sqrt(
            ((point.x - area.x) / area.rx) ** 2 +
                ((point.y - area.y) / area.ry) ** 2,
        );
        const progress = Math.max(0, Math.min(1, (1.25 - distance) / 0.45));
        const eased = progress * progress * (3 - 2 * progress);
        strength = Math.max(strength, eased);
    }
    return strength;
}

function phase(s: State, next: Phase) {
    s.phase = next;
    s.phaseTime = 0;
}

/** 純粋な状態更新。タブ非表示・カメラエラー中は呼ばず、時間を停止する。 */
export function step(
    previous: State,
    hand: Hand | null,
    elapsed: number,
): State {
    const dt = Math.min(Math.max(elapsed, 0), 0.1);
    const s = {
        ...previous,
        clock: previous.clock + dt,
        phaseTime: previous.phaseTime + dt,
        stroking: false,
    };
    s.absence = hand ? 0 : s.absence + dt;
    if (s.phase === "sleeping") {
        if (s.absence >= CONFIG.rearmAbsence) s.rearmed = true;
        if (hand && s.rearmed && s.phaseTime >= CONFIG.sleepMinimum) {
            const next = initialState();
            phase(next, "active");
            return next;
        }
        s.reveal = Math.max(0, s.reveal - dt * 0.75);
        return s;
    }
    if (s.phase === "waiting") {
        if (hand) {
            phase(s, "active");
            s.calm = 0;
        } else {
            const t = s.clock % CONFIG.peekEvery;
            const peekStart = CONFIG.peekEvery - CONFIG.peekDuration;
            const peek =
                t > peekStart
                    ? Math.sin(
                          ((t - peekStart) / CONFIG.peekDuration) * Math.PI,
                      ) * CONFIG.peekReveal
                    : 0;
            s.reveal = peek;
            return s;
        }
    }
    s.interactionTime += dt;
    if (s.absence >= CONFIG.sleepAfterAbsence) {
        phase(s, "sleeping");
        s.rearmed = false;
        s.absence = 0;
        return s;
    }
    if (s.fullTime !== null) {
        s.fullTime += dt;
        if (s.fullTime >= CONFIG.sleepAfterMax) {
            phase(s, "sleeping");
            s.rearmed = false;
            s.absence = 0;
            return s;
        }
        if (s.fullTime >= CONFIG.drowsyAfterMax && s.phase !== "drowsy")
            phase(s, "drowsy");
    }
    const fast =
        !!hand && inside(hand, NEAR) && hand.speed > CONFIG.startleSpeed;
    s.fast = fast ? s.fast + dt : 0;
    if (
        s.phase !== "drowsy" &&
        s.phase !== "startled" &&
        s.fast >= CONFIG.startleHold
    ) {
        phase(s, "startled");
        s.comfort = Math.max(0, s.comfort - CONFIG.comfortLoss);
        s.calm = 0;
    }
    if (s.phase === "startled") {
        s.calm = !fast && hand ? s.calm + dt : 0;
        if (s.calm >= CONFIG.startleRecovery) phase(s, "active");
    } else if (hand) {
        s.calm += dt;
        const contact =
            s.phase === "active" && s.reveal > 0.65
                ? contactStrength(hand, HEAD)
                : 0;
        s.stroking =
            contact >= 0.5 &&
            hand.speed >= CONFIG.strokeMinSpeed &&
            hand.speed <= CONFIG.strokeMaxSpeed;
        // グーパーは見た目のみ。どちらでも同じ位置・速度で触れ合える。
        if (s.phase === "active")
            s.comfort = Math.min(
                100,
                s.comfort +
                    dt *
                        (CONFIG.calmPerSecond +
                            contact *
                                (CONFIG.comfortPerSecond -
                                    CONFIG.calmPerSecond)),
            );
        if (s.comfort >= 100 && s.fullTime === null) {
            s.fullTime = 0;
        }
    }
    if (s.absence > CONFIG.retreatAfter)
        s.comfort = Math.max(0, s.comfort - dt * CONFIG.absenceLossPerSecond);
    const target =
        s.phase === "startled" || s.absence >= CONFIG.retreatAfter
            ? 0
            : Math.min(1, s.calm / CONFIG.greetSeconds);
    const rate = s.phase === "startled" ? 5 : 0.8;
    s.reveal +=
        Math.sign(target - s.reveal) *
        Math.min(Math.abs(target - s.reveal), dt * rate);
    return s;
}

export function hint(s: State) {
    if (s.phase === "sleeping") return "おやすみ。";
    if (s.phase === "waiting" || s.absence > 3) return "てを、みせてみて。";
    if (s.phase === "startled") return "そっと、まってみて。";
    if (s.interactionTime < CONFIG.hintSeconds) return "ゆっくり、なでてみて。";
    return "";
}
