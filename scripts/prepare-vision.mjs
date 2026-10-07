import { cp, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("public/vision/", root);
await mkdir(output, { recursive: true });
try {
    const wasm = new URL("node_modules/@mediapipe/tasks-vision/wasm/", root);
    await access(wasm);
    await cp(fileURLToPath(wasm), fileURLToPath(new URL("wasm/", output)), {
        recursive: true,
    });
    console.log("MediaPipe WASM copied to public/vision/wasm.");
} catch (error) {
    console.error(
        "MediaPipe WASMの配置に失敗しました。npm install後にnpm run prepare:visionを実行してください。",
    );
    throw error;
}
