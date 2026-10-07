import { useCallback, useEffect, useRef, useState } from "react";
import { Komori } from "./components/Komori";
import { initialState, step, hint, type Hand, type Pose } from "./game/engine";
import { CONFIG } from "./game/config";
import { SleepSound } from "./game/sound";
import { startCamera, cameraError } from "./input/camera";
import { HandFilter } from "./input/hand";
import openHand from "../assets/hand-candidates/lucide/hand-five-pale-orange.svg";
import closedHand from "../assets/hand-candidates/lucide/hand-grab-pale-orange.svg";

type Mode = "setup" | "loading" | "camera" | "mouse";
export default function App() {
    const [mode, setMode] = useState<Mode>("setup");
    const [state, setState] = useState(initialState);
    const [hand, setHand] = useState<Hand | null>(null);
    const [error, setError] = useState("");
    const [soundOn, setSoundOn] = useState(true);
    const [paused, setPaused] = useState(false);
    const video = useRef<HTMLVideoElement>(null);
    const scene = useRef<SVGSVGElement>(null);
    const input = useRef<Hand | null>(null);
    const pointer = useRef<{ x: number; y: number; pose: Pose } | null>(null);
    const abort = useRef<AbortController | null>(null);
    const sound = useRef(new SleepSound());
    const controller = useRef(initialState());
    const filter = useRef(new HandFilter());
    const request = useRef(0);
    const modeRef = useRef<Mode>(mode);
    modeRef.current = mode;

    const leave = useCallback(() => {
        request.current++;
        abort.current?.abort();
        abort.current = null;
        sound.current.stop();
        input.current = null;
        pointer.current = null;
        filter.current.reset();
        setHand(null);
        setMode("setup");
        controller.current = initialState();
        setState(controller.current);
    }, []);

    const begin = async (next: "camera" | "mouse") => {
        leave();
        setError("");
        const id = request.current;
        if (soundOn) void sound.current.unlock().catch(() => setSoundOn(false));
        if (next === "mouse") {
            setMode("mouse");
            return;
        }
        const ac = new AbortController();
        abort.current = ac;
        setMode("loading");
        try {
            await startCamera(
                video.current!,
                ac.signal,
                (value) => {
                    if (request.current === id) input.current = value;
                },
                (err) => {
                    if (request.current !== id) return;
                    leave();
                    setError(cameraError(err));
                },
            );
            if (!ac.signal.aborted && request.current === id) setMode("camera");
        } catch (err) {
            if (ac.signal.aborted || request.current !== id) return;
            leave();
            setError(cameraError(err));
        }
    };

    useEffect(() => {
        let frame = 0,
            last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            if (!document.hidden) {
                if (modeRef.current === "mouse") {
                    const p = pointer.current;
                    input.current = p
                        ? filter.current.update(p, p.pose, now)
                        : null;
                }
                if (
                    modeRef.current === "camera" ||
                    modeRef.current === "mouse"
                ) {
                    controller.current = step(
                        controller.current,
                        input.current,
                        dt,
                    );
                    setState(controller.current);
                    setHand(
                        (previous) =>
                            input.current ??
                            (controller.current.absence < CONFIG.absenceGrace
                                ? previous
                                : null),
                    );
                }
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        const visibility = () => {
            last = performance.now();
            filter.current.reset();
            input.current = null;
            pointer.current = null;
            setPaused(document.hidden);
            if (document.hidden) sound.current.stop();
        };
        document.addEventListener("visibilitychange", visibility);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, []);

    useEffect(() => {
        if (
            state.phase === "sleeping" &&
            soundOn &&
            !paused &&
            (mode === "camera" || mode === "mouse")
        )
            sound.current.start();
        else sound.current.stop();
    }, [state.phase, soundOn, paused, mode]);
    useEffect(
        () => () => {
            request.current++;
            abort.current?.abort();
            sound.current.dispose();
        },
        [],
    );
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                leave();
                return;
            }
            if (modeRef.current !== "mouse") return;
            if (e.code === "Space") {
                e.preventDefault();
                if (!e.repeat && pointer.current)
                    pointer.current.pose =
                        pointer.current.pose === "open" ? "closed" : "open";
            }
            if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                )
            ) {
                e.preventDefault();
                pointer.current ??= { x: 640, y: 460, pose: "open" };
                const p = pointer.current;
                p.x = Math.max(
                    0,
                    Math.min(
                        1280,
                        p.x +
                            (e.key === "ArrowLeft"
                                ? -8
                                : e.key === "ArrowRight"
                                  ? 8
                                  : 0),
                    ),
                );
                p.y = Math.max(
                    0,
                    Math.min(
                        800,
                        p.y +
                            (e.key === "ArrowUp"
                                ? -8
                                : e.key === "ArrowDown"
                                  ? 8
                                  : 0),
                    ),
                );
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [leave]);

    const move = (event: React.PointerEvent<SVGSVGElement>) => {
        if (mode !== "mouse") return;
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
            matrix.inverse(),
        );
        pointer.current = {
            x: p.x,
            y: p.y,
            pose: pointer.current?.pose ?? "open",
        };
    };
    const playing = mode === "camera" || mode === "mouse";
    const visibleHand = playing && hand && state.phase !== "sleeping";
    const status = hint(state);
    return (
        <main className={`app ${mode === "mouse" ? "mouse-mode" : ""}`}>
            <video
                ref={video}
                className="camera-input"
                muted
                playsInline
                aria-hidden="true"
            />
            <svg
                ref={scene}
                className="scene"
                viewBox="0 0 1280 800"
                role="img"
                aria-label={`こもり。${playing ? status : "はじめまして。"}`}
                data-phase={state.phase}
                data-reveal={state.reveal.toFixed(2)}
                data-comfort={state.comfort.toFixed(1)}
                onPointerMove={move}
                onPointerLeave={() => {
                    pointer.current = null;
                    filter.current.reset();
                }}
                onPointerDown={(event) => {
                    if (mode === "mouse") {
                        move(event);
                        if (pointer.current) pointer.current.pose = "closed";
                    }
                }}
                onPointerUp={() => {
                    if (pointer.current) pointer.current.pose = "open";
                }}
            >
                <text
                    x="64"
                    y="79"
                    className="wordmark"
                >
                    こもり
                </text>
                <Komori
                    state={playing ? state : initialState()}
                    hand={hand}
                />
                {visibleHand && (
                    <image
                        data-testid="hand"
                        data-pose={hand.pose}
                        href={hand.pose === "closed" ? closedHand : openHand}
                        x={hand.x - 64}
                        y={hand.y - 64}
                        width="128"
                        height="128"
                        className="hand"
                        opacity={Math.max(
                            0,
                            1 - state.absence / CONFIG.absenceGrace,
                        )}
                    />
                )}
                {playing && (
                    <text
                        x="640"
                        y="729"
                        textAnchor="middle"
                        className="hint"
                        key={status}
                    >
                        {status}
                    </text>
                )}
            </svg>
            <p
                className="sr-only"
                aria-live="polite"
            >
                {playing ? status : ""}
            </p>
            {!playing && (
                <section
                    className="setup"
                    aria-label="体験の準備"
                >
                    <div className="setup-copy">
                        <h1>
                            {mode === "loading"
                                ? "もうすこし、おまちください。"
                                : "ちょっと、人見知りです。"}
                        </h1>
                        <p>
                            {mode === "loading"
                                ? "カメラと手の準備をしています。"
                                : "手をみせて、ゆっくり。画面の中のこもりに会ってみませんか。"}
                        </p>
                        {error && (
                            <p
                                className="error"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                        <div className="setup-actions">
                            {mode === "loading" ? (
                                <button
                                    className="text-button"
                                    onClick={leave}
                                >
                                    準備をやめる
                                </button>
                            ) : (
                                <>
                                    <button
                                        className="primary"
                                        onClick={() => void begin("camera")}
                                    >
                                        カメラを使って、会ってみる{" "}
                                        <span aria-hidden="true">→</span>
                                    </button>
                                    <button
                                        className="text-button"
                                        onClick={() => void begin("mouse")}
                                    >
                                        マウスでためす
                                    </button>
                                </>
                            )}
                        </div>
                        {mode === "setup" && (
                            <label className="sound-choice">
                                <input
                                    type="checkbox"
                                    checked={soundOn}
                                    onChange={(e) =>
                                        setSoundOn(e.target.checked)
                                    }
                                />{" "}
                                音をつける
                            </label>
                        )}
                        <p className="setup-note">
                            {mode === "loading"
                                ? "許可の案内が出たら、カメラの使用を許可してください。"
                                : "カメラ映像は保存・送信しません。途中で戻るときは Esc。"}
                            <br />
                            {mode === "setup" &&
                                "マウスでは、押している間はグー。手を画面の外へ動かすと離れます。"}
                        </p>
                    </div>
                </section>
            )}
        </main>
    );
}
