import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Tv, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  url: string;
  description: string;
}

// Banco de canais inicializado no código. Novos canais podem ser adicionados aqui de forma super fácil!
const CHANNELS_DATABASE: Channel[] = [
  {
    id: 'cancaonova',
    name: 'Canção Nova',
    url: 'https://5c65286fc6ace.streamlock.net/cancaonova/CancaoNova.stream_720p/playlist.m3u8',
    description: 'Programação ao vivo de evangelização e louvor'
  },
  {
    id: 'paieterno',
    name: 'Pai Eterno',
    url: 'https://59dfb7d85c4dc.streamlock.net/paieterno/paieterno.stream_720p/playlist.m3u8',
    description: 'Santo Terço, missas e novena dos filhos do Pai Eterno'
  },
  {
    id: 'paieterno-alt',
    name: 'Pai Eterno (Alt)',
    url: 'http://udq.me/live/7SyrYN0fMy/3772288787/35899.m3u8',
    description: 'Canal Divino Pai Eterno - Transmissão Alternativa'
  },
  {
    id: 'tv-aparecida',
    name: 'TV Aparecida',
    url: 'https://5c6528fc8de1e.streamlock.net/aparecida/Aparecida.stream_360p/playlist.m3u8',
    description: 'Transmissões do Santuário Nacional de Aparecida'
  }
];

export default function TvLivePlayer() {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChannel = CHANNELS_DATABASE[currentChannelIndex];

  // Carrega e inicializa o HLS Stream no elemento video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset states
    setLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    // Destruir instância Hls prévia se houver
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(activeChannel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        // Tenta autoplay de forma amigável
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Se falhou por causa das políticas de interação do navegador, tenta mudo
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                setIsPlaying(false);
              });
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg('Erro de rede ao carregar a transmissão. Tente recarregar.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg('Erro de mídia ao processar codec.');
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg('Não foi possível conectar com o servidor da TV.');
              break;
          }
          setLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Suporte nativo para Safari (iOS/Mac)
      video.src = activeChannel.url;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true));
          });
      });

      video.addEventListener('error', () => {
        setErrorMsg('Erro ao abrir canal no Safari.');
        setLoading(false);
      });
    } else {
      setErrorMsg('Seu navegador não suporta transmissões de vídeo ao vivo HLS (.m3u8)');
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannelIndex]);

  // Sincroniza o volume do vídeo
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Gerencia o ocultamento automático de controles de reprodução
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !loading) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Ações de controle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const triggerFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .catch((err) => {
          console.error(`Erro ao ativar tela cheia: ${err.message}`);
        });
    } else {
      document.exitFullscreen();
    }
  };

  const nextChannel = () => {
    setCurrentChannelIndex((prev) => (prev + 1) % CHANNELS_DATABASE.length);
  };

  const reloadStream = () => {
    // Força recarregamento do index corrente
    const idx = currentChannelIndex;
    setCurrentChannelIndex(-1);
    setTimeout(() => {
      setCurrentChannelIndex(idx);
    }, 50);
  };

  return (
    <div className="w-full flex flex-col p-4 md:p-6 lg:p-8 max-w-6xl mx-auto select-none bg-zinc-950 text-white rounded-3xl border border-zinc-900 shadow-2xl mt-4">
      
      {/* Header do Player IPTV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30 shrink-0">
            <Tv className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-gray-150 tracking-tight leading-none uppercase">
                Canal {activeChannel.name}
              </h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-white text-[9px] font-extrabold rounded-full animate-pulse uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                AO VIVO
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-1 uppercase max-w-md truncate">
              {activeChannel.description}
            </p>
          </div>
        </div>

        {/* Botão Próximo Canal no Topo */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={nextChannel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 text-white text-xs font-black rounded-xl border border-zinc-700 transition-all cursor-pointer hover:shadow-lg active:scale-95"
            title="Avançar para o próximo canal configurado no código"
          >
            <span>Próximo Canal</span>
            <ChevronRight className="w-4 h-4 text-orange-400" />
          </button>
        </div>
      </div>

      {/* Container de Vídeo Ocupando o Centro com Dimensões Grandes */}
      <div 
        ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video md:max-h-[580px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-900/70 group"
      >
        <video
          ref={videoRef}
          playsInline
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Overlay do Spinner de Carregamento */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 transition-opacity">
            <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-600 rounded-full animate-spin mb-4" />
            <p className="text-zinc-300 text-xs font-bold uppercase tracking-widest animate-pulse">Sintonizando Canal live...</p>
          </div>
        )}

        {/* Overlay de Erro do Stream */}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-white text-sm font-black uppercase mb-1">{errorMsg}</p>
            <p className="text-zinc-400 text-xs max-w-sm mb-4">Verifique sua conexão de Internet ou clique abaixo para reiniciar.</p>
            <button
              onClick={reloadStream}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              <span>Recarregar Transmissão</span>
            </button>
          </div>
        )}

        {/* Controles Customizados com Fade in/out */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 flex flex-col justify-between p-4 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Top Control Bar Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-100 text-[11px] font-extrabold uppercase tracking-wide bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800/60">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
              <span>LIVE • CANAL {currentChannelIndex + 1} DE {CHANNELS_DATABASE.length}</span>
            </div>

            <button
              onClick={reloadStream}
              className="p-1.5 bg-black/40 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-colors cursor-pointer border border-zinc-800/40"
              title="Recarregar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Control Bar Customizado */}
          <div className="flex flex-col gap-3">
            {/* Play/Pause Central Overlay Grande (Hover) */}
            <div className="absolute inset-0 w-max h-max m-auto pointer-events-none transition-transform active:scale-90 flex items-center justify-center">
              {!isPlaying && !loading && !errorMsg && (
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-16 h-16 pointer-events-auto flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg border border-orange-500 scale-100 transition-all hover:scale-110 active:scale-95"
                >
                  <Play className="w-8 h-8 fill-white ml-1" />
                </button>
              )}
            </div>

            {/* Linha de Progresso/Indicador Simbólico Live */}
            <div className="w-full bg-red-600 h-1 rounded-full relative overflow-hidden shrink-0 mt-2">
              <div className="absolute inset-0 bg-gradient-to-r from-red-650 to-red-500 w-full animate-pulse" />
            </div>

            {/* Botões e Status */}
            <div className="flex items-center justify-between gap-4 shrink-0">
              {/* Controles de Play, Mudo e Volume */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-orange-500 transition-colors cursor-pointer"
                  title={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-orange-500 transition-colors cursor-pointer"
                    title={isMuted ? 'Ativar Som' : 'Mudar'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 md:w-24 h-1 bg-zinc-700 accent-orange-600 rounded-lg appearance-none cursor-pointer"
                    title="Ajustar Volume"
                  />
                </div>
              </div>

              {/* Canal Atual e Tela Cheia */}
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-xs font-black text-zinc-300 uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-lg">
                  {activeChannel.name}
                </span>

                <button
                  onClick={triggerFullscreen}
                  className="text-white hover:text-orange-500 transition-colors cursor-pointer"
                  title="Tela Cheia"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
