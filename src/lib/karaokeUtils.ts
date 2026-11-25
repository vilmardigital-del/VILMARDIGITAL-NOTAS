export interface SongTiming {
  id: number;
  startTime: number;
  endTime: number;
}

export const formatSyncTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
};

export const formatShortTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const prepareDisplayLines = (content: string, isHtml: boolean): string[] => {
  if (!content) return [];
  if (!isHtml) {
    return content.split('\n');
  }
  const normalized = content
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*(?:p|div|li|h[1-6])[^>]*>/gi, '');
  return normalized.split('\n');
};

export const isSyncableLyricLine = (
  line: string,
  isChordLineFn: (l: string) => boolean
): boolean => {
  const plainText = line.replace(/<[^>]*>/g, '').trim();
  if (!plainText) return false;
  if (isChordLineFn(line)) return false;
  if (/^\[[^\]]+\]$/.test(plainText)) return false;
  if (/^Tom:\s*[A-G]/i.test(plainText)) return false;
  if (/^\((?:Refr[aã]o|Intro|Solo|Estrofe(?:\s+\d+)?|Parte(?:\s+\d+)?)\)$/i.test(plainText)) {
    return false;
  }
  return true;
};

export const findActiveTiming = (
  timings: SongTiming[],
  currentTime: number
): SongTiming | null => {
  if (!timings || timings.length === 0) return null;
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    if (currentTime >= t.startTime && currentTime < t.endTime) {
      return t;
    }
  }
  return null;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;

export const loadYouTubeIframeApi = (): Promise<any> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      ytApiPromise = null;
      reject(new Error('Tempo limite ao carregar a API do YouTube.'));
    }, 10000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      if (typeof previousReady === 'function') {
        try {
          previousReady();
        } catch {
          // ignore
        }
      }
      resolve(window.YT);
    };

    const existingScript = document.querySelector(
      'script[src*="youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        window.clearTimeout(timeout);
        ytApiPromise = null;
        reject(new Error('Falha ao carregar o player do YouTube.'));
      };
      document.head.appendChild(tag);
    } else {
      const poll = window.setInterval(() => {
        if (window.YT && typeof window.YT.Player === 'function') {
          window.clearInterval(poll);
          window.clearTimeout(timeout);
          resolve(window.YT);
        }
      }, 100);
    }
  });

  return ytApiPromise;
};

export type CountdownStep = 1 | 2 | 3 | 4;

export const COUNTDOWN_WORDS_PT: Record<CountdownStep, string> = {
  1: 'Um',
  2: 'Dois',
  3: 'Três',
  4: 'Quatro'
};

let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
};

export const unlockCountdownAudio = (): void => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // ignore browser autoplay errors
      });
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  } catch {
    // ignore audio unlock errors
  }
};

const playMetronomeBeat = (step: CountdownStep, volume = 0.16): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    // Beat 1 slightly higher pitch for clear downbeat accent
    osc.frequency.setValueAtTime(step === 1 ? 1046.5 : 784, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  } catch {
    // ignore Web Audio errors
  }
};

export const playCountdownCue = (step: CountdownStep, audioEnabled = true): void => {
  if (!audioEnabled || typeof window === 'undefined') return;

  const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  // Soft metronome click on each beat (louder fallback if speechSynthesis is unavailable)
  playMetronomeBeat(step, hasSpeech ? 0.12 : 0.28);

  if (!hasSpeech) return;

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(COUNTDOWN_WORDS_PT[step]);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.15;
    utterance.pitch = step === 4 ? 1.05 : 1.0;
    utterance.volume = 1;

    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      const ptBrVoice =
        voices.find((v) => v.lang.toLowerCase() === 'pt-br') ||
        voices.find((v) => v.lang.toLowerCase().startsWith('pt-br')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (ptBrVoice) {
        utterance.voice = ptBrVoice;
      }
    }

    synth.speak(utterance);
  } catch {
    // Web Audio click already sounded as fallback
  }
};

export const stopCountdownAudio = (): void => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
};

