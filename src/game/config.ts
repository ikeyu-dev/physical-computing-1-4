/** 調整用の仮値。時間は秒、位置はFigmaの1280×800座標。 */
export const CONFIG = {
    width: 1280,
    height: 800,
    greetSeconds: 1.6,
    absenceGrace: 0.6,
    retreatAfter: 10,
    sleepAfterAbsence: 30,
    sleepAfterMax: 20,
    sleepMinimum: 4,
    rearmAbsence: 1.2,
    startleSpeed: 1100,
    startleHold: 0.1,
    startleRecovery: 2.5,
    strokeMinSpeed: 16,
    strokeMaxSpeed: 420,
    comfortPerSecond: 9,
    calmPerSecond: 0.8,
    comfortLoss: 12,
    absenceLossPerSecond: 3,
    peekEvery: 8,
    peekDuration: 2.4,
    peekReveal: 0.65,
    hintSeconds: 9,
} as const;

export const HEAD = { x: 625, y: 463, rx: 144, ry: 90 };
export const NEAR = { x: 640, y: 465, rx: 330, ry: 270 };
