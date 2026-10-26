// Browsers only allow sound after the user has touched the page once.
// So: unlockAudio() runs from a tap, playChime() can run any time afterwards.
let context: AudioContext | null = null;

export function unlockAudio(): boolean {
  try {
    if (!context) context = new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context.state !== "closed";
  } catch {
    return false;
  }
}

// Three rising notes, like a doorbell.
export function playChime(): void {
  if (!context || context.state !== "running") return;
  const notes = [660, 880, 1100];
  notes.forEach((frequency, i) => {
    const start = context!.currentTime + i * 0.22;
    const osc = context!.createOscillator();
    const gain = context!.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain).connect(context!.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

export function vibrate(): void {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 500]);
  } catch {
    /* not supported (iPhone Safari): sound and screen still work */
  }
}
