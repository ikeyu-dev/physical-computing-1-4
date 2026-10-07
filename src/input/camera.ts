import { HandFilter, closedHand, palmPosition } from "./hand";
import type { Hand } from "../game/engine";

export function cameraError(error: unknown) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError")
        return "カメラが許可されていません。ブラウザの設定で許可して、もう一度お試しください。";
    if (name === "NotFoundError")
        return "カメラが見つかりません。接続を確認するか、マウスで試せます。";
    if (name === "NotReadableError")
        return "カメラを開けませんでした。他のアプリで使用していないか確認してください。";
    return error instanceof Error
        ? error.message
        : "カメラの準備ができませんでした。もう一度お試しください。";
}

export async function startCamera(
    video: HTMLVideoElement,
    signal: AbortSignal,
    onHand: (hand: Hand | null) => void,
    onFailure: (error: Error) => void,
) {
    if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
            "カメラを使うには、localhost または HTTPS で開いてください。",
        );
    let stream: MediaStream | null = null;
    let detector: import("@mediapipe/tasks-vision").HandLandmarker | null =
        null;
    let frame = 0;
    let stopped = false;
    const filter = new HandFilter();
    const stop = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        stream?.getTracks().forEach((track) => track.stop());
        detector?.close();
        detector = null;
        video.srcObject = null;
        onHand(null);
    };
    signal.addEventListener("abort", stop, { once: true });
    const check = () => {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    };
    try {
        check();
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
            },
            audio: false,
        });
        check();
        video.srcObject = stream;
        await video.play();
        check();
        const { FilesetResolver, HandLandmarker } =
            await import("@mediapipe/tasks-vision");
        const wasm = await FilesetResolver.forVisionTasks("/vision/wasm");
        check();
        const options = {
            runningMode: "VIDEO" as const,
            numHands: 1,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.6,
        };
        try {
            detector = await HandLandmarker.createFromOptions(wasm, {
                ...options,
                baseOptions: {
                    modelAssetPath: "/models/hand_landmarker.task",
                    delegate: "GPU",
                },
            });
        } catch {
            check();
            detector = await HandLandmarker.createFromOptions(wasm, {
                ...options,
                baseOptions: {
                    modelAssetPath: "/models/hand_landmarker.task",
                    delegate: "CPU",
                },
            });
        }
        check();
        let lastDetect = 0,
            lastVideoTime = -1,
            lastFrameAt = performance.now();
        const fail = (error: Error) => {
            stop();
            onFailure(error);
        };
        stream.getVideoTracks().forEach((track) =>
            track.addEventListener("ended", () => {
                if (!stopped)
                    fail(
                        new Error(
                            "カメラとの接続が切れました。接続を確認して、もう一度お試しください。",
                        ),
                    );
            }),
        );
        const tick = (now: number) => {
            if (stopped || signal.aborted || !detector) return;
            if (document.hidden) {
                filter.reset();
                lastFrameAt = now;
                frame = requestAnimationFrame(tick);
                return;
            }
            try {
                if (
                    now - lastDetect >= 50 &&
                    video.readyState >= 2 &&
                    video.currentTime !== lastVideoTime
                ) {
                    lastVideoTime = video.currentTime;
                    lastDetect = now;
                    lastFrameAt = now;
                    const result = detector.detectForVideo(video, now);
                    const points = result.landmarks[0];
                    if (points)
                        onHand(
                            filter.update(
                                palmPosition(points),
                                closedHand(points) ? "closed" : "open",
                                now,
                            ),
                        );
                    else {
                        filter.reset();
                        onHand(null);
                    }
                }
                if (now - lastFrameAt > 4000) {
                    fail(
                        new Error(
                            "カメラの映像が止まりました。もう一度接続してください。",
                        ),
                    );
                    return;
                }
            } catch {
                fail(
                    new Error(
                        "手を読み取れなくなりました。カメラをつなぎ直してください。",
                    ),
                );
                return;
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return stop;
    } catch (error) {
        stop();
        signal.removeEventListener("abort", stop);
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        throw error;
    }
}
