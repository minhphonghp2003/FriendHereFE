let ctx: AudioContext | null = null;
let beepTimer: ReturnType<typeof setInterval> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function beep(ac: AudioContext): void {
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

export const callAudio = {
  play(): void {
    this.stop();
    const ac = getContext();
    if (!ac) return;
    if (ac.state === "running") beep(ac);
    beepTimer = setInterval(() => {
      const active = getContext();
      if (active && active.state === "running") beep(active);
    }, 1200);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(200);
      vibrateTimer = setInterval(() => {
        navigator.vibrate?.(200);
      }, 1400);
    }
  },

  stop(): void {
    if (beepTimer) {
      clearInterval(beepTimer);
      beepTimer = null;
    }
    if (vibrateTimer) {
      clearInterval(vibrateTimer);
      vibrateTimer = null;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(0);
    }
  },
};
