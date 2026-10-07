# 素材・ライブラリの出典

- こもりの線画：このプロジェクトの既存 [Figma](https://www.figma.com/design/0EpjkvJE9MkRGb3iJPmTOu)。`design/ui-study/assets/komori-awake.svg` のパスを分け、顔・目・殻を動かしている。
- 手：Lucide Icons、ISC License。元の手にペールオレンジの塗りと輪郭の調整を加えたもの。詳細は `assets/hand-candidates/SOURCES.txt`、ライセンスは同フォルダと `public/licenses/Lucide-LICENSE.txt`。
- Klee One：Google Fonts、SIL Open Font License 1.1。`public/fonts/KleeOne-Regular.ttf`。[取得元](https://github.com/google/fonts/tree/main/ofl/kleeone)、原文は `public/licenses/KleeOne-OFL.txt`。
- MediaPipe Tasks Vision：Google、Apache-2.0。npmの `@mediapipe/tasks-vision` からWASMをコピーし、ローカル配信する。[ソースとライセンス](https://github.com/google-ai-edge/mediapipe)。原文は `public/licenses/MediaPipe-Apache-2.0.txt`。
- 手の認識モデル：MediaPipe Hand Landmarker、float16 / version 1。`public/models/hand_landmarker.task`。[公式配布ファイル](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task)、[公式のモデル概要](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)。

そのほかのnpm依存関係のバージョンは `package-lock.json`、各ライセンスはインストールしたパッケージに含まれる情報を参照。
