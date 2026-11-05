import { useEffect, useRef, useState } from "react";
import type { State } from "./types";
export function useAudio(state: State | null) {
  const [enabled, setEnabled] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [caption, setCaption] = useState(
      "Xin kính chào quý vị đến chung vui cùng Marry Live!",
    );
  const media = useRef<HTMLAudioElement | null>(null);
  const engine = useRef<{
    ctx: AudioContext;
    music: GainNode;
    fx: GainNode;
    osc: OscillatorNode[];
  } | null>(null);
  const seen = useRef(new Set<string>()),
    busy = useRef(false),
    lastFinish = useRef(0),
    current = useRef(state);
  current.current = state;
  const enable = async () => {
    if (!engine.current) {
      const ctx = new AudioContext(),
        music = ctx.createGain(),
        fx = ctx.createGain();
      music.connect(ctx.destination);
      fx.connect(ctx.destination);
      music.gain.value = 0;
      const osc = [220, 275, 330].map((hz) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = hz;
        const g = ctx.createGain();
        g.gain.value = 0.035;
        o.connect(g);
        g.connect(music);
        o.start();
        return o;
      });
      engine.current = { ctx, music, fx, osc };
    }
    await engine.current.ctx.resume();
    setEnabled(true);
  };
  useEffect(() => {
    if (engine.current && state)
      engine.current.music.gain.setTargetAtTime(
        state.config.music_volume * (speaking ? 0.2 : 1),
        engine.current.ctx.currentTime,
        0.2,
      );
  }, [speaking, state?.config.music_volume]);
  useEffect(() => {
    const timer = setInterval(() => {
      const s = current.current;
      if (
        !s ||
        busy.current ||
        Date.now() - lastFinish.current < s.config.speech_pause
      )
        return;
      const next = s.speeches
        .filter((x) => !seen.current.has(x.id) && x.expires > Date.now() / 1000)
        .sort((a, b) => b.priority - a.priority || a.at - b.at)[0];
      if (!next) return;
      // Subtitles work even before the browser permits audio.
      seen.current.add(next.id);
      setCaption(next.text);
      busy.current = true;
      setSpeaking(true);
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        busy.current = false;
        setSpeaking(false);
        lastFinish.current = Date.now();
      };
      const voices =
        window.speechSynthesis
          ?.getVoices()
          .filter((v) => v.lang.toLowerCase().startsWith("vi")) || [];
      if (enabled && next.audio_url) {
        const a = new Audio(next.audio_url);
        media.current = a;
        a.volume = s.config.mc_volume;
        a.onended = end;
        a.onerror = end;
        void a.play().catch(end);
        setTimeout(() => {
          if (!done) {
            a.pause();
            end();
          }
        }, 20000);
      } else if (enabled && voices.length) {
        const speech = new SpeechSynthesisUtterance(next.text);
        speech.voice =
          voices.find((v) => v.name === s.config.voice) || voices[0];
        speech.lang = "vi-VN";
        speech.volume = s.config.mc_volume;
        speech.rate = s.config.speech_rate;
        speech.onend = end;
        speech.onerror = end;
        window.speechSynthesis.speak(speech);
        setTimeout(() => {
          if (!done) {
            window.speechSynthesis.cancel();
            end();
          }
        }, 20000);
      } else setTimeout(end, Math.min(9000, next.text.length * 55));
    }, 300);
    return () => clearInterval(timer);
  }, [enabled]);
  const fxSeen = useRef(new Set<string>());
  useEffect(() => {
    if (!state) return;
    for (const e of state.effects) {
      if (fxSeen.current.has(e.id) || e.until < Date.now() / 1000) continue;
      fxSeen.current.add(e.id);
      const eng = engine.current;
      if (!enabled || !eng) continue;
      const o = eng.ctx.createOscillator(),
        g = eng.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(660, eng.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(990, eng.ctx.currentTime + 0.15);
      g.gain.setValueAtTime(
        state.config.effect_volume * 0.15,
        eng.ctx.currentTime,
      );
      g.gain.exponentialRampToValueAtTime(0.001, eng.ctx.currentTime + 0.5);
      o.connect(g);
      g.connect(eng.fx);
      o.start();
      o.stop(eng.ctx.currentTime + 0.5);
    }
  }, [state?.effects, enabled]);
  useEffect(
    () => () => {
      media.current?.pause();
      window.speechSynthesis?.cancel();
      engine.current?.osc.forEach((o) => o.stop());
      void engine.current?.ctx.close();
    },
    [],
  );
  return { enabled, speaking, caption, enable };
}
