/** 録音素材を使わず、弱いノイズと音量の波で寝息を作る。 */
export class SleepSound {
    private context: AudioContext | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private master: GainNode | null = null;
    async unlock() {
        this.context ??= new AudioContext();
        if (!this.master) {
            this.master = this.context.createGain();
            this.master.connect(this.context.destination);
        }
        this.master.gain.value = 0.1;
        await this.context.resume();
    }
    start() {
        if (!this.context || this.timer) return;
        this.master?.gain.setTargetAtTime(0.1, this.context.currentTime, 0.1);
        const breath = () => {
            const ctx = this.context;
            if (
                !ctx ||
                !this.master ||
                ctx.state !== "running" ||
                document.hidden
            )
                return;
            const buffer = ctx.createBuffer(
                1,
                ctx.sampleRate * 2.4,
                ctx.sampleRate,
            );
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = (Math.random() * 2 - 1) * 0.25;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 500;
            const gain = ctx.createGain();
            const t = ctx.currentTime;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.7, t + 0.8);
            gain.gain.linearRampToValueAtTime(0, t + 2.4);
            noise.connect(filter).connect(gain).connect(this.master);
            noise.onended = () => {
                noise.disconnect();
                filter.disconnect();
                gain.disconnect();
            };
            noise.start();
        };
        breath();
        this.timer = setInterval(breath, 4400);
    }
    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        if (this.context && this.master)
            this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    }
    dispose() {
        this.stop();
        void this.context?.close();
        this.context = null;
    }
}
