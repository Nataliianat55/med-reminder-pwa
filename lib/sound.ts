let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

export async function playDing(): Promise<void> {
  const audioCtx = getCtx();
  if (!audioCtx) return;

  try {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  } catch {
    // ignore
  }

  const duration = 0.5;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

