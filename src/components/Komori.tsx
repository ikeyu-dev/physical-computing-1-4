import type { Hand, State } from "../game/engine";

// Figma 4:6の線画をパーツ化。顔の縮小はせず、殻の奥へ移動して隠す。
export function Komori({ state, hand }: { state: State; hand: Hand | null }) {
    const asleep = state.phase === "sleeping";
    const sleepy = state.phase === "drowsy";
    const softEyes = state.stroking || sleepy;
    const lookX = hand
        ? Math.max(-5, Math.min(5, (hand.x - 625) / 45))
        : Math.sin(state.clock * 1.4) * 3;
    const lookY = hand ? Math.max(-3, Math.min(3, (hand.y - 505) / 70)) : 0;
    const breathe = asleep
        ? 1 + Math.sin((state.clock * Math.PI) / 2.2) * 0.008
        : 1;
    const faceScale = 0.55 + state.reveal * 0.45;
    const faceOpacity = Math.min(1, state.reveal * 2.5);
    return (
        <g
            transform="translate(290 165) scale(1.4)"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <defs>
                <radialGradient
                    id="shell-opening"
                    cx="50%"
                    cy="50%"
                    r="70%"
                >
                    <stop
                        offset="0"
                        stopColor="#302B26"
                    />
                    <stop
                        offset="0.58"
                        stopColor="#51483F"
                    />
                    <stop
                        offset="1"
                        stopColor="#74685B"
                    />
                </radialGradient>
                <clipPath id="face-opening">
                    <path
                        transform="translate(245 250) scale(1.025) translate(-245 -250)"
                        d="M170 300C153 281 152 245 167 218C184 181 232 169 275 183C317 198 334 254 314 288C291 319 203 326 170 300Z"
                    />
                </clipPath>
            </defs>
            <path
                d="M82 333C194 339 308.667 338 426 330"
                stroke="var(--line)"
                strokeWidth="2.4"
            />
            <g
                transform={`translate(250 315) scale(1 ${breathe}) translate(-250 -315)`}
            >
                <path
                    d="M125 284C100 222 130 115 204 90C259 70 329 92 357 142C388 195 389 262 363 294C307 315 174 315 125 284Z"
                    fill="var(--shell)"
                    stroke="var(--ink)"
                    strokeWidth="2.4"
                />
                <path
                    d="M170 300C153 281 152 245 167 218C184 181 232 169 275 183C317 198 334 254 314 288C291 319 203 326 170 300Z"
                    transform="translate(243 242) scale(0.92) translate(-243 -247.5)"
                    fill="url(#shell-opening)"
                    stroke="var(--ink)"
                    strokeWidth="2.4"
                />
                <path
                    d="M188 117C194 111.667 201.333 108 210 106M218 103L228 102"
                    stroke="var(--muted)"
                    strokeWidth="2.4"
                />
                <g clipPath="url(#face-opening)">
                    <g
                        data-testid="face"
                        transform={`translate(243 247.5) scale(${faceScale}) translate(-243 -247.5)`}
                        opacity={faceOpacity}
                    >
                        <path
                            d="M170 300C153 281 152 245 167 218C184 181 232 169 275 183C317 198 334 254 314 288C291 319 203 326 170 300Z"
                            fill="var(--paper)"
                            stroke="var(--ink)"
                            strokeWidth="2.4"
                        />
                        <g transform={`translate(${lookX} ${lookY})`}>
                            {softEyes ? (
                                <g
                                    stroke="var(--ink)"
                                    strokeWidth="2.4"
                                >
                                    <path d="M202 254C206.667 258 211.667 257.333 217 252" />
                                    <path d="M260 250C264.667 254 269.667 253.333 275 248" />
                                </g>
                            ) : (
                                <g className="eyes">
                                    <ellipse
                                        cx="209"
                                        cy="255"
                                        rx="4.5"
                                        ry="6"
                                        fill="var(--ink)"
                                    />
                                    <ellipse
                                        cx="266"
                                        cy="251"
                                        rx="4.5"
                                        ry="6"
                                        fill="var(--ink)"
                                    />
                                </g>
                            )}
                        </g>
                        {sleepy ? (
                            <ellipse
                                cx="236"
                                cy="280"
                                rx="5"
                                ry="7"
                                stroke="var(--ink)"
                                strokeWidth="2"
                            />
                        ) : (
                            <path
                                d="M228 280C234 283.333 239.333 282.667 244 278"
                                stroke="var(--ink)"
                                strokeWidth="2"
                            />
                        )}
                        <path
                            d="M187 272L198 270M276 268L287 266"
                            stroke="var(--accent)"
                            strokeWidth="3"
                        />
                    </g>
                </g>
                <path
                    d="M169 310C159 317 161 324 181 324M297 309C315 314 318 322 300 325"
                    stroke="var(--ink)"
                    strokeWidth="2.4"
                    opacity={Math.max(0, (state.reveal - 0.9) * 10)}
                />
            </g>
            {state.phase === "startled" && state.phaseTime < 0.7 && (
                <path
                    d="M385 124L395 110M398 137L414 132"
                    stroke="var(--accent)"
                    strokeWidth="2.4"
                />
            )}
            {asleep && state.reveal < 0.05 && (
                <g
                    className="sleep-marks"
                    stroke="var(--muted)"
                    strokeWidth="2.4"
                >
                    <path d="M377 118H390L378 130H391M399 94H415L400 109H416" />
                </g>
            )}
            <path
                d="M98 322C94.6667 310.667 94 303.333 96 300M97 319C103.667 309.667 109.333 305.667 114 307"
                stroke="var(--moss)"
                strokeWidth="2.4"
            />
        </g>
    );
}
