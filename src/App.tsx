import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { 
  HandHeart,
  Heart,
  Sun,
  Crown,
  Mic2,
  Gift,
  DoorOpen,
  Flag,
  Music, 
  Church,
  Mic,
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  Maximize2, 
  Minimize2, 
  Edit2, 
  Trash2, 
  LogOut, 
  LogIn,
  MoreVertical,
  Sparkles,
  ExternalLink,
  ListMusic,
  Calendar,
  Layers,
  ChevronRight,
  Check,
  X,
  Youtube,
  Minus,
  FileText,
  Lock,
  ArrowUpDown,
  ArrowLeftRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Play,
  Pause,
  RotateCcw,
  Wand2,
  Users,
  Info,
  Eye,
  EyeOff,
  Headphones,
  Camera,
  Image,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from './lib/firebase';
import { CATEGORIES, Category, Song, Playlist, AccessUser, MuralEvent, MassaPhoto } from './types';
import { getSantoDoDia, getReflexaoEspiritual } from './santos_db';
import VoiceRecorder from './VoiceRecorder';
import heic2any from 'heic2any';

const CATEGORIES_MISSA: Category[] = [
  'Entrada',
  'Perdão',
  'Glória',
  'Salmos',
  'Aleluia',
  'Santo',
  'Cordeiro',
  'Comum',
  'Ofertório',
  'Comunhão',
  'Final'
];

const CATEGORIES_GRUPO: Category[] = [
  'Espírito Santo',
  'Louvor',
  'Perdão',
  'Mariana',
  'Entrega',
  'Adoração'
];

const CHORD_REGEX_STR = "(?:[A-G]|Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si)[b#♯♭]?(?:m|M|maj|min|dim|aug|sus|add|alt|ø|°|\\+|\\-|7|9|11|13|5|6|2|4|Δ)*(?:\\([^)]+\\))?(?:\\/(?:[A-G]|Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si)[b#♯♭]?(?:m|M|7|9|11|13|5|6|2|4)?)?";
const CHORD_REGEX = new RegExp(`(?<![a-zA-ZáàãâéêíóôõúÁÀÃÂÉÊÍÓÔÕÚ])(${CHORD_REGEX_STR})(?![a-zA-ZáàãâéêíóôõúÁÀÃÂÉÊÍÓÔÕÚ])`, 'g');
const CHORD_REGEX_EXACT = new RegExp(`^${CHORD_REGEX_STR}$`);

// Palavras comuns que podem ser confundidas com acordes (ex: "e", "Do")
// Se a linha tiver outras palavras, evitamos classificar estas palavras curtas individuais como acordes
const EXCLUDED_WORDS = ['e', 'E', 'A', 'a', 'O', 'o', 'Do', 'do', 'Da', 'da', 'Si', 'si', 'De', 'de', 'no', 'No', 'em', 'Em', 'me', 'Me', 'te', 'Te', 'se', 'Se'];

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Components
const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    {/* Rosário Beads SVG */}
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
      {/* Circunferência do Rosário - Contas */}
      {[...Array(12)].map((_, i) => {
        const radiusX = 48;
        const radiusY = 48;
        const angle = (i * 360 / 12) - 90;
        const rad = (angle * Math.PI) / 180;
        const x = 50 + radiusX * Math.cos(rad);
        const y = 48 + radiusY * Math.sin(rad);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#16a34a" className="opacity-60" />;
      })}
      {/* Medalha e Cruz na parte de baixo */}
      <circle cx="50" cy="94" r="3" fill="#16a34a" />
      <path d="M50 96 L50 103" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 99 L53 99" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
    </svg>
    
    {/* Guitar Pick Shape SVG */}
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-[80%] h-[80%] left-[10%] top-[8%] drop-shadow-sm">
      <path 
        d="M 10 32 C 10 15 25 2 50 2 C 75 2 90 15 90 32 C 90 55 65 92 50 98 C 35 92 10 55 10 32 Z" 
        fill="#16a34a" 
      />
    </svg>
    <Music className="relative z-10 w-[35%] h-[35%] text-white -translate-y-1" />
  </div>
);

const PasswordView = ({ onUnlock, accessUsers }: { onUnlock: (role: 'admin' | 'viewer', identifier: string, id?: string, isMaster?: boolean) => void, accessUsers: AccessUser[] }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const adminUsername = 'Vilmardigital';
  const adminPassword = '4526';
  const userPasswordDefault = '7946';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    // Check dynamic users first
    const foundUser = accessUsers.find(u => 
      u.name.toLowerCase() === normalizedUsername.toLowerCase() && 
      u.password === normalizedPassword
    );
    if (foundUser) {
      const actualRole = foundUser.role === 'master' ? 'admin' : foundUser.role;
      const isMasterUser = foundUser.role === 'master';
      onUnlock(actualRole, foundUser.name, foundUser.id, isMasterUser);
      return;
    }

    // Fallback to fixed credentials
    if (normalizedUsername.toLowerCase() === adminUsername.toLowerCase() && normalizedPassword === adminPassword) {
      onUnlock('admin', adminUsername, undefined, true);
    } else if (normalizedUsername.toLowerCase() === 'usuario' && normalizedPassword === userPasswordDefault) {
      onUnlock('viewer', 'Usuário Padrão', undefined, false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50/30 px-6 text-center select-none overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-100/50 blur-[100px] rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-100/50 blur-[100px] rounded-full" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.6 
        }}
        className="mb-8 relative"
      >
        {/* Animated Glow Effect */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-40"
        />
        
        <div className="relative w-64 h-64 bg-white rounded-[56px] flex items-center justify-center p-4 shadow-2xl shadow-emerald-500/10 group hover:shadow-emerald-500/20 transition-all duration-500">
          <Logo className="w-56 h-56" />
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/50 to-transparent rounded-[48px] pointer-events-none" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs"
      >
        <h1 className="text-3xl font-bold text-orange-600 mb-2 tracking-tight font-display">Louvemos ao Senhor</h1>
        <p className="text-zinc-400 mb-8 font-light">Partituras e Cifras Digitais</p>

        <form onSubmit={handleSubmit} className="space-y-1 text-left">
          <div className="space-y-0.5">
            <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Login</label>
            <div className="relative">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="text"
                placeholder="Seu nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full bg-zinc-900 border ${error ? 'border-orange-500' : 'border-orange-600 focus:border-orange-400'} text-white pl-11 pr-4 py-2.5 rounded-2xl outline-none transition-all placeholder:text-zinc-600 font-medium`}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1 font-sans">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="password"
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-zinc-900 border ${error ? 'border-orange-500' : 'border-orange-600 focus:border-orange-400'} text-white pl-11 pr-4 py-2.5 rounded-2xl outline-none transition-all placeholder:text-zinc-600 font-medium tracking-widest`}
              />
            </div>
          </div>

          <div className="h-3 relative">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 text-orange-600 text-[10px] font-bold text-center"
              >
                Credenciais incorretas. Tente novamente.
              </motion.div>
            )}
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-600/20 font-display uppercase tracking-wider text-sm cursor-pointer"
          >
            Acessar
          </motion.button>

          <div className="flex items-center my-4 py-1">
            <div className="flex-1 border-t border-zinc-200/20"></div>
            <span className="px-3 text-[10px] uppercase font-black tracking-widest text-zinc-500">ou</span>
            <div className="flex-1 border-t border-zinc-200/20"></div>
          </div>

          <motion.button 
            type="button"
            onClick={() => onUnlock('viewer', 'Público', undefined, false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 font-sans uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-white" />
            Público
          </motion.button>
        </form>
      </motion.div>

      <div className="absolute bottom-8 text-zinc-600 text-sm font-light">
        © 2026 Louvemos ao Senhor • Versão 2.4
      </div>
    </div>
  );
};

const getCategoryIcon = (category: Category, className: string = "w-6 h-6") => {
  switch (category) {
    case 'Entrada': return <Church className={className} />;
    case 'Perdão': return <HandHeart className={className} />;
    case 'Glória': return <Sun className={className} />;
    case 'Santo': return <Crown className={className} />;
    case 'Aleluia': return <Mic2 className={className} />;
    case 'Salmos': return <Music className={className} />;
    case 'Cordeiro': return <Heart className={className} />;
    case 'Ofertório': return <Gift className={className} />;
    case 'Comunhão': return <Layers className={className} />;
    case 'Final': return <Flag className={className} />;
    case 'Comum': return <Music className={className} />;
    case 'Grupo de Oração': return <Users className={className} />;
    case 'Espírito Santo': return <Sparkles className={className} />;
    case 'Louvor': return <Mic2 className={className} />;
    case 'Mariana': return <Heart className={className} />;
    case 'Entrega': return <HandHeart className={className} />;
    case 'Adoração': return <Crown className={className} />;
    default: return <Music className={className} />;
  }
};

const getCategoryGradient = (category: Category) => {
  return 'from-orange-300 to-orange-500';
};

const getYoutubeEmbedUrl = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) 
    ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` 
    : null;
};

const transposeChord = (chord: string, semitones: number) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const latinToStandard: { [key: string]: string } = {
    'Dó': 'C', 'Do': 'C',
    'Ré': 'D', 'Re': 'D',
    'Mi': 'E',
    'Fá': 'F', 'Fa': 'F',
    'Sol': 'G',
    'Lá': 'A', 'La': 'A',
    'Si': 'B'
  };

  const trans = (c: string) => {
    // Normalize Latin to Standard notation first
    let normalizedChord = c;
    for (const [latin, standard] of Object.entries(latinToStandard)) {
      if (normalizedChord.startsWith(latin)) {
        normalizedChord = normalizedChord.replace(latin, standard);
        break;
      }
    }
    
    // Separate the note from the rest of the chord (m7, etc.)
    const match = normalizedChord.match(/^([A-G][b#]?)(.*)/);
    if (!match) return c;
    
    let note = match[1];
    const suffix = match[2];
    
    let index = notes.indexOf(note);
    // If not found in notes (standard), try to normalize/handle flats if necessary, 
    // but with normalization above it should be standard.
    
    if (index === -1) return c;
    
    const newIndex = (index + semitones + 12) % 12;
    return notes[newIndex] + suffix;
  };

  // Handle slash chords (e.g., C/G)
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return trans(parts[0]) + '/' + trans(parts[1]);
  }
  
  return trans(chord);
};

const highlightChords = (html: string) => {
  if (!html) return '';
  
  // Clean existing spans to avoid duplicates
  const cleanedHtml = html.replace(/<span className="text-orange-600 font-bold">([^<]+)<\/span>/g, '$1')
                          .replace(/<span class="text-orange-600 font-bold">([^<]+)<\/span>/g, '$1')
                          .replace(/<span className="text-chord-orange font-bold">([^<]+)<\/span>/g, '$1')
                          .replace(/<span class="text-chord-orange font-bold">([^<]+)<\/span>/g, '$1');
                          
  return cleanedHtml.replace(CHORD_REGEX, (match) => {
    return `<span class="text-chord-orange font-bold">${match}</span>`;
  });
};

const FullScreenSong = ({ song, onClose, onPrev, onNext, initialTranspose = 0, onTransposeChange }: { 
  song: Song, 
  onClose: () => void,
  onPrev?: () => void,
  onNext?: () => void,
  initialTranspose?: number,
  onTransposeChange?: (val: number) => void
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [fontSize, setFontSize] = useState(16); // Default font size in px
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    setTranspose(initialTranspose);
  }, [initialTranspose, song.id]);

  useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error('Wake Lock failed:', err);
        }
      }
    };

    requestWakeLock();
    document.body.style.overflow = 'hidden';

    return () => {
      if (wakeLock) {
        wakeLock.release().catch((err: any) => console.error('Wake Lock release failed:', err));
      }
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleTranspose = (delta: number) => {
    const newVal = transpose + delta;
    setTranspose(newVal);
    onTransposeChange?.(newVal);
  };

  const transposeHtml = (html: string, semitones: number) => {
    // Clean existing spans to avoid doubling up
    const cleanedHtml = html.replace(/<span className="text-orange-600 font-bold">([^<]+)<\/span>/g, '$1')
                            .replace(/<span class="text-orange-600 font-bold">([^<]+)<\/span>/g, '$1')
                            .replace(/<span className="text-chord-orange font-bold">([^<]+)<\/span>/g, '$1')
                            .replace(/<span class="text-chord-orange font-bold">([^<]+)<\/span>/g, '$1');

    return cleanedHtml.replace(CHORD_REGEX, (match) => {
      const transposed = semitones !== 0 ? transposeChord(match, semitones) : match;
      return `<span class="text-chord-orange font-bold">${transposed}</span>`;
    });
  };

  const isChordLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Remove tags HTML para análise de texto puro
    const plainText = trimmed.replace(/<[^>]*>/g, '').trim();
    
    // Remove cabeçalhos de seções que não são letras ou cifras (ex: [Intro], [Solo], (Arranjo))
    const cleaned = plainText.replace(/\[[^\]]+\]/g, '').replace(/\([^)]+\)/g, '').trim();
    if (!cleaned) return false;

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    const wordsCount = words.length;
    if (wordsCount === 0) return false;

    // Verifica se todas as palavras limpas na linha são candidatas a cifra válidas
    const allWordsAreChords = words.every(w => {
      const cleanWord = w.replace(/[,.:;!?()]/g, '').trim();
      return CHORD_REGEX_EXACT.test(cleanWord);
    });
    
    const chordsCount = words.filter(w => {
      const cleanWord = w.replace(/[,.:;!?()]/g, '').trim();
      if (!cleanWord) return false;
      
      const isExactlyChord = CHORD_REGEX_EXACT.test(cleanWord);
      if (!isExactlyChord) return false;

      // Se for uma palavra excluída comum (como 'A', 'E', 'Do'...)
      // só contamos como cifra sob duas condições:
      // 1. Há apenas essa palavra na linha.
      // 2. Ou TODAS as palavras da linha são cifras válidas.
      if (EXCLUDED_WORDS.includes(cleanWord)) {
        return allWordsAreChords || wordsCount === 1;
      }
      
      return true;
    }).length;
    
    return chordsCount / wordsCount >= 0.4;
  };

  const isHtml = /<[a-z][\s\S]*>/i.test(song.content);
  const processedContent = song.content || "";

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 0.99, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white text-gray-900 flex flex-col"
    >

      {/* Header Fixo */}
      <div className="bg-white border-b border-orange-100 px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <button 
            onClick={onClose}
            className="p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{song.title}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-orange-600">{getCategoryIcon(song.category, "w-3 h-3")}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{song.category}</span>
              {song.ownerId && (
                <>
                  <span className="text-gray-300 text-[10px]">•</span>
                  <span className="text-[10px] text-gray-400 font-medium">Por: {song.ownerId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {song.youtubeUrl && (
            <button 
              onClick={() => setShowPlayer(!showPlayer)}
              className={`p-2 rounded-lg transition-all ${showPlayer ? 'bg-orange-600 text-white shadow-lg' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
              title="YouTube"
            >
              <Youtube className="w-5 h-5" />
            </button>
          )}
          
          <div className="h-6 w-[1px] bg-gray-100 mx-1"></div>

          <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
            <button 
              onClick={() => handleTranspose(-1)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
              title="Diminuir tom"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-black w-7 text-center text-orange-700">
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button 
              onClick={() => handleTranspose(1)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
              title="Aumentar tom"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 ml-1 text-gray-400 hover:bg-gray-100 rounded-full"
            title="Fechar"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div 
        id="song-content-area"
        className="flex-1 overflow-auto bg-gray-50/30 
        [&_.text-chord-orange]:!text-chord-orange [&_.text-chord-orange]:!font-bold
        [&_p]:text-black [&_p]:font-bold [&_div]:text-black [&_div]:font-bold"
      >
        <div className="max-w-2xl mx-auto p-6 md:p-10 pb-32">
          {isHtml ? (
            <div 
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: song.lineHeight || 1.5,
                letterSpacing: song.letterSpacing !== undefined ? `${song.letterSpacing}px` : 'normal',
                textAlign: song.textAlign || 'left'
              }}
              className="font-mono transition-all rich-text-song whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: transposeHtml(processedContent, transpose) }}
            />
          ) : (
            <div 
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: song.lineHeight || 1.5,
                letterSpacing: song.letterSpacing !== undefined ? `${song.letterSpacing}px` : 'normal',
                textAlign: song.textAlign || 'left'
              }}
              className="whitespace-pre-wrap font-mono transition-all text-black"
            >
              {processedContent.split('\n').map((line, i) => {
                const isChords = isChordLine(line);
                
                const parts = line.split(/(\s+)/);
                return (
                  <div 
                    key={i} 
                    className={`min-h-[1.2em] relative font-bold ${isChords ? 'text-chord-orange !text-chord-orange pb-1 mt-2' : 'text-black mb-2'}`}
                  >
                    {parts.map((part, j) => {
                      const trimmed = part.trim();
                      const isChord = isChords && CHORD_REGEX_EXACT.test(trimmed);
                      if (isChord && trimmed.length > 0) {
                        const transposed = transpose !== 0 ? transposeChord(trimmed, transpose) : trimmed;
                        return (
                          <span 
                            key={j} 
                            className="font-bold text-chord-orange !text-chord-orange"
                          >
                            {part.replace(trimmed, transposed)}
                          </span>
                        );
                      }
                      return <span key={j}>{part}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Controls Bar (Navigation, Font Size & Hide) on the Bottom Right */}
      {showControls ? (
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-orange-200 p-2 rounded-2xl shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-200 max-w-[calc(100vw-32px)]">
          {/* Playlist Navigation Controls */}
          {(onPrev || onNext) && (
            <div className="flex items-center gap-1 bg-orange-600 rounded-xl p-0.5 shadow-sm">
              <button 
                disabled={!onPrev}
                onClick={onPrev} 
                className="w-8 h-8 flex items-center justify-center text-white disabled:opacity-30 hover:bg-orange-500 rounded-lg transition-all cursor-pointer"
                title="Música anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-5 bg-orange-400"></div>
              <button 
                disabled={!onNext}
                onClick={onNext} 
                className="w-8 h-8 flex items-center justify-center text-white disabled:opacity-30 hover:bg-orange-500 rounded-lg transition-all cursor-pointer"
                title="Próxima música"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Divider between Navigation and Font Size */}
          {(onPrev || onNext) && <div className="w-[1px] h-6 bg-orange-200 mx-0.5"></div>}

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-orange-100/50">
            <button 
              type="button"
              onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all font-black text-xs cursor-pointer"
              title="Diminuir letra"
            >
              A-
            </button>
            <span className="text-[11px] font-black w-10 text-center text-orange-700 select-none">
              {fontSize}px
            </span>
            <button 
              type="button"
              onClick={() => setFontSize(prev => Math.min(36, prev + 1))}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all font-black text-xs cursor-pointer"
              title="Aumentar letra"
            >
              A+
            </button>
          </div>

          <div className="w-[1px] h-6 bg-orange-200 mx-0.5"></div>

          {/* Hide Button */}
          <button
            type="button"
            onClick={() => setShowControls(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all cursor-pointer"
            title="Ocultar botões"
          >
            <EyeOff className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="fixed bottom-6 right-6 z-30 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setShowControls(true)}
            className="w-12 h-12 flex items-center justify-center bg-white/95 backdrop-blur-md border border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white rounded-full shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Exibir ferramentas de visualização (Tamanho / Músicas)"
          >
            <Eye className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Floating Player */}
      <AnimatePresence>
        {showPlayer && song.youtubeUrl && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlayer(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-40%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-40%' }}
              className="fixed top-1/2 left-1/2 w-[90%] md:w-[640px] z-50 group transition-all"
            >
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-orange-500 aspect-video relative">
                <button 
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 z-10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                {getYoutubeEmbedUrl(song.youtubeUrl) ? (
                  <iframe 
                    src={getYoutubeEmbedUrl(song.youtubeUrl)!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs p-4 text-center">
                    Link do YouTube inválido
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const dataURItoBlob = (dataURI: string): Blob => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

const compressImage = (file: File, maxDimension: number = 640, quality: number = 0.45): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // fallback to original dataUrl
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [userRole, setUserRole] = useState<'admin' | 'viewer' | null>(() => {
    const saved = localStorage.getItem('userRole');
    return (saved === 'admin' || saved === 'viewer') ? saved : null;
  });
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(() => {
    return localStorage.getItem('isMasterAdmin') === 'true';
  });
  const [userIdentifier, setUserIdentifier] = useState<string | null>(() => {
    return localStorage.getItem('userIdentifier');
  });
  const [userProfilePic, setUserProfilePic] = useState<string | null>(() => {
    const id = localStorage.getItem('userIdentifier');
    return id ? localStorage.getItem(`profilePic_${id}`) : null;
  });

  // Sync profile pic when user changes
  useEffect(() => {
    if (userIdentifier) {
      setUserProfilePic(localStorage.getItem(`profilePic_${userIdentifier}`));
    } else {
      setUserProfilePic(null);
    }
  }, [userIdentifier]);

  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('userId');
  });
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('sessionId');
  });

  const handleLogout = async () => {
    if (userId) {
      try {
        await updateDoc(doc(db, 'access_users', userId), {
          isOnline: false,
          currentSessionId: null
        });
      } catch (err) {
        console.error("Error setting presence on logout:", err);
      }
    }
    setUserRole(null);
    setUserIdentifier(null);
    setUserId(null);
    setSessionId(null);
    setIsMasterAdmin(false);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userIdentifier');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('isMasterAdmin');
  };

  // Active status/presence real-time heartbeat
  useEffect(() => {
    if (!userId || !sessionId) return;

    let intervalId: any;

    const updatePresence = async (online: boolean) => {
      try {
        await updateDoc(doc(db, 'access_users', userId), {
          isOnline: online,
          lastActive: online ? Date.now() : null
        });
      } catch (err) {
        // Silently ignore permissions issues
      }
    };

    updatePresence(true);

    intervalId = setInterval(() => {
      updatePresence(true);
    }, 15000);

    return () => {
      clearInterval(intervalId);
      updatePresence(false);
    };
  }, [userId, sessionId]);

  // Session monitor
  useEffect(() => {
    if (userId && sessionId) {
      const unsub = onSnapshot(doc(db, 'access_users', userId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AccessUser;
          if (data.currentSessionId && data.currentSessionId !== sessionId) {
            handleLogout();
            alert("Aviso: Sua conta foi conectada em outro dispositivo. Você foi desconectado para garantir a segurança.");
          }
        }
      });
      return () => unsub();
    }
  }, [userId, sessionId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [events, setEvents] = useState<MuralEvent[]>([]);

  // Filter songs added in the last 48 hours
  const newSongsLast48h = useMemo(() => {
    const now = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    return songs.filter(song => {
      if (!song.createdAt) {
        if (song.updatedAt) {
          let updateTime = 0;
          if (typeof song.updatedAt.toDate === 'function') {
            updateTime = song.updatedAt.toDate().getTime();
          } else if (song.updatedAt.seconds) {
            updateTime = song.updatedAt.seconds * 1000;
          } else {
            updateTime = new Date(song.updatedAt).getTime();
          }
          return (now - updateTime) <= fortyEightHoursMs;
        }
        return false;
      }
      let songTime = 0;
      if (typeof song.createdAt.toDate === 'function') {
        songTime = song.createdAt.toDate().getTime();
      } else if (song.createdAt.seconds) {
        songTime = song.createdAt.seconds * 1000;
      } else {
        songTime = new Date(song.createdAt).getTime();
      }
      return (now - songTime) <= fortyEightHoursMs;
    });
  }, [songs]);

  // Category and Event States
  const [currentCategoryTab, setCurrentCategoryTab] = useState<'missa' | 'grupo' | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [eventSaving, setEventSaving] = useState(false);
  const [muralSongsExpanded, setMuralSongsExpanded] = useState(false);
  const [muralEventsExpanded, setMuralEventsExpanded] = useState(false);

  // Photo States
  const [massaPhotos, setMassaPhotos] = useState<MassaPhoto[]>([]);
  const [activePhotoSlide, setActivePhotoSlide] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<MassaPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null || lightboxPhotos.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setLightboxIndex(prev => (prev !== null ? (prev + 1) % lightboxPhotos.length : 0));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setLightboxIndex(prev => (prev !== null ? (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length : 0));
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, lightboxPhotos]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [selectedUploadDate, setSelectedUploadDate] = useState<string>(() => {
    const today = new Date();
    const offset = -3; // UTC-3 para Brasília
    const localDate = new Date(today.getTime() + offset * 3600 * 1000);
    return localDate.toISOString().split("T")[0];
  });
  const [newPhotoDesc, setNewPhotoDesc] = useState('');
  const [newPhotoSaving, setNewPhotoSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isConvertingPhotos, setIsConvertingPhotos] = useState(false);

  // Hidden system to filter slide photos to those uploaded/created in the last 4 days
  const slidePhotos = useMemo(() => {
    const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return massaPhotos.filter(photo => {
      if (!photo.createdAt) return true; // show newly uploaded/pending immediately

      let uploadTime = 0;
      if (typeof photo.createdAt.toMillis === 'function') {
        uploadTime = photo.createdAt.toMillis();
      } else if (photo.createdAt.seconds !== undefined) {
        uploadTime = photo.createdAt.seconds * 1000 + ((photo.createdAt.nanoseconds || 0) / 1000000);
      } else if (photo.createdAt instanceof Date) {
        uploadTime = photo.createdAt.getTime();
      } else if (typeof photo.createdAt === 'number') {
        uploadTime = photo.createdAt;
      } else if (typeof photo.createdAt === 'string') {
        const parsed = Date.parse(photo.createdAt);
        if (!isNaN(parsed)) uploadTime = parsed;
      }

      if (uploadTime === 0) return false;
      return (now - uploadTime) <= fourDaysInMs;
    });
  }, [massaPhotos]);

  // Keep active photo list index in bounds
  useEffect(() => {
    if (activePhotoSlide >= slidePhotos.length && slidePhotos.length > 0) {
      setActivePhotoSlide(0);
    }
  }, [slidePhotos.length, activePhotoSlide]);

  const formatPhotoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    
    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayName = daysOfWeek[dateObj.getDay()];
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month + 1).padStart(2, '0');
    return `${dayName}, ${formattedDay}/${formattedMonth}/${year}`;
  };

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'liturgia' | 'recorder' | 'users' | 'events_panel' | 'photos'>('songs');
  const [viewMode, setViewMode] = useState<'categories' | 'songs' | 'edit-song' | 'playlist-list' | 'edit-playlist' | 'view-playlist' | 'manage-users' | 'liturgia' | 'recorder' | 'events_panel' | 'photos'>('categories');
  
  // Liturgia States
  const [liturgiaDate, setLiturgiaDate] = useState<string>(() => {
    const today = new Date();
    const offset = -3; // UTC-3 para Brasília
    const localDate = new Date(today.getTime() + offset * 3600 * 1000);
    return localDate.toISOString().split("T")[0];
  });
  const [liturgiaData, setLiturgiaData] = useState<any>(null);
  const [liturgiaLoading, setLiturgiaLoading] = useState<boolean>(false);
  const [liturgiaError, setLiturgiaError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'liturgia') return;
    
    let isCancelled = false;
    const fetchLiturgia = async () => {
      setLiturgiaLoading(true);
      setLiturgiaError(null);
      try {
        const [yearStr, monthStr, dayStr] = liturgiaDate.split("-");
        const yearVal = parseInt(yearStr, 10);
        const monthVal = parseInt(monthStr, 10);
        const dayVal = parseInt(dayStr, 10);

        const months = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        const monthIndex = monthVal - 1;
        const readableDate = `${dayVal} de ${months[monthIndex]} de ${yearVal}`;

        let dataObj: any;
        let sources: Array<{ title: string; url: string }> = [
          { title: "API Liturgia Diária", url: "https://liturgia.up.railway.app/" }
        ];

        try {
          // Buscar da API pública liturgia-diaria-api diretamente no navegador
          const apiUrl = `https://liturgia.up.railway.app/?dia=${dayVal}&mes=${monthVal}`;
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          const apiData = await response.json();

          // Deduzir o Tempo Litúrgico com base na comemoração ou data
          let tempoLiturgico = "Tempo Comum";
          const liturgiaText = (apiData.liturgia || "").toLowerCase();
          if (liturgiaText.includes("páscoa") || liturgiaText.includes("pascoal")) {
            tempoLiturgico = "Tempo Pascal";
          } else if (liturgiaText.includes("quaresma") || liturgiaText.includes("cinzas")) {
            tempoLiturgico = "Tempo da Quaresma";
          } else if (liturgiaText.includes("advento")) {
            tempoLiturgico = "Tempo do Advento";
          } else if (liturgiaText.includes("natal")) {
            tempoLiturgico = "Tempo do Natal";
          }

          // Cor litúrgica
          let corLiturgica = apiData.cor || "Verde";
          if (corLiturgica) {
            corLiturgica = corLiturgica.charAt(0).toUpperCase() + corLiturgica.slice(1).toLowerCase();
          }

          // Construir listagem de leituras
          const leituras: string[] = [];
          if (apiData.primeiraleitura?.referencia) {
            leituras.push(`Primeira Leitura: ${apiData.primeiraleitura.referencia}`);
          }
          if (apiData.segundaleitura?.referencia) {
            leituras.push(`Segunda Leitura: ${apiData.segundaleitura.referencia}`);
          }
          if (apiData.salmo?.referencia) {
            leituras.push(`Salmo Responsorial: ${apiData.salmo.referencia}`);
          }
          if (apiData.evangelho?.referencia) {
            leituras.push(`Evangelho: ${apiData.evangelho.referencia}`);
          }

          // Obter informações estáticas polidas do Santo do Dia com base no calendário de 366 dias
          const santoInfo = getSantoDoDia(monthVal, dayVal);

          // Gerar reflexão pastoral contextualizada de alta qualidade
          const celebracao = apiData.liturgia || santoInfo.santo || "Celebração do dia";
          const reflexao = getReflexaoEspiritual(tempoLiturgico, celebracao, liturgiaDate);

          dataObj = {
            tempoLiturgico,
            corLiturgica,
            celebracao,
            santoDoDia: santoInfo.biografia,
            santoDoDiaResumo: santoInfo.resumo,
            leituras,
            evangelhoTitulo: apiData.evangelho?.referencia || "Evangelho do Dia",
            evangelhoTexto: apiData.evangelho?.texto || "Proclamação indisponível.",
            reflexao,
            oracao: santoInfo.oracao,
            sources
          };
        } catch (innerError) {
          console.warn("Falha no fetch da API litúrgica, aplicando fallback:", innerError);
          // Fallback robusto offline
          const santoInfo = getSantoDoDia(monthVal, dayVal);
          let tempoLiturgico = "Tempo Comum";
          if (monthVal === 12 && dayVal >= 17 && dayVal <= 24) {
            tempoLiturgico = "Tempo do Advento";
          } else if (monthVal === 12 && dayVal >= 25) {
            tempoLiturgico = "Tempo do Natal";
          } else if (monthVal === 1 && dayVal <= 6) {
            tempoLiturgico = "Tempo do Natal";
          }
          const celebracao = santoInfo.santo || "Celebração Diária";
          const reflexao = getReflexaoEspiritual(tempoLiturgico, celebracao, liturgiaDate);

          dataObj = {
            tempoLiturgico,
            corLiturgica: (tempoLiturgico === "Tempo Comum" ? "Verde" : (tempoLiturgico === "Tempo do Advento" ? "Roxo" : "Branco")),
            celebracao,
            santoDoDia: santoInfo.biografia,
            santoDoDiaResumo: santoInfo.resumo,
            leituras: [
              "Primeira Leitura: Provérbios 3,1-6",
              "Salmo Responsorial: Sl 118",
              "Evangelho: Mateus 11,25-30"
            ],
            evangelhoTitulo: "Mateus 11,25-30",
            evangelhoTexto: "Naquele tempo, Jesus tomou a palavra e disse: 'Eu te louvo, Pai, Senhor do céu e da terra, porque escondeste estas coisas aos sábios e inteligentes, e as revelaste aos pequeninos. Sim, Pai, porque assim foi do vosso agrado. Tudo me foi entregue por meu Pai, e ninguém conhece o Filho senão o Pai, e ninguém conhece o Pai senão o Filho e aquele a quem o Filho o quiser revelar. Vinde a mim, todos vós que estais cansados e fatigados sob o peso dos vossos fardos, e eu vos darei descanso. Tomai sobre vós o meu jugo e aprendei de mim, porque sou manso e humilde de coração, e vós encontrareis descanso para as vossas almas. Pois o meu jugo é suave e o meu fardo é leve'.",
            reflexao,
            oracao: santoInfo.oracao,
            sources: [{ title: "Calendário Litúrgico Local (Seguro)", url: "https://aistudio.build" }]
          };
        }

        if (isCancelled) return;
        setLiturgiaData({
          ...dataObj,
          readableDate
        });
      } catch (err: any) {
        if (!isCancelled) {
          setLiturgiaError("Erro ao carregar as informações litúrgicas.");
        }
      } finally {
        if (!isCancelled) {
          setLiturgiaLoading(false);
        }
      }
    };
    
    fetchLiturgia();
    return () => {
      isCancelled = true;
    };
  }, [liturgiaDate, activeTab]);
  
  // Editor State Deleted
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'master' | 'admin' | 'viewer'>('viewer');
  
  // Song selection/editing
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  
  // Playlist selection/editing
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  
  // Sync selectedPlaylist with live data
  useEffect(() => {
    if (selectedPlaylist) {
      const updated = playlists.find(p => p.id === selectedPlaylist.id);
      if (updated) {
        setSelectedPlaylist(updated);
      }
    }
  }, [playlists]);
  const [editingPlaylist, setEditingPlaylist] = useState<Partial<Playlist> | null>(null);
  const [currentPlaylistSongIndex, setCurrentPlaylistSongIndex] = useState(0);
  const playlistSearchRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [playlistSongSearchTerm, setPlaylistSongSearchTerm] = useState('');

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userIdentifier) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUserProfilePic(base64);
      localStorage.setItem(`profilePic_${userIdentifier}`, base64);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // Safety timeout: stop loading after 5 seconds no matter what
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    if (auth) {
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          signInAnonymously(auth).catch((error) => {
            console.error("Firebase Auth anonymous error:", error);
          });
        }
      });
    }

    if (!db) {
      console.error("Database connection failed. Please check your configuration.");
      setLoading(false);
      return () => clearTimeout(timeout);
    }

    // Filtered songs for better performance
    const songsQuery = query(
      collection(db, 'songs'), 
      orderBy('createdAt', 'desc')
    );

    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Song[];
      setSongs(docs);
    }, (error) => {
      console.error("Songs listener error:", error);
    });

    const playlistsQuery = query(
      collection(db, 'playlists'),
      orderBy('createdAt', 'desc')
    );

    const unsubPlaylists = onSnapshot(playlistsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Playlist[];
      setPlaylists(docs);
    }, (error) => {
      console.error("Playlists listener error:", error);
    });

    const usersQuery = query(
      collection(db, 'access_users'),
      orderBy('createdAt', 'desc')
    );

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccessUser[];
      setAccessUsers(docs);
      setLoading(false);
      clearTimeout(timeout);
    });

    const eventsQuery = query(
      collection(db, 'events')
    );

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Sort in-memory safely to handle local pending timestamps and documents missing createdAt
      const sortedDocs = [...docs].sort((a, b) => {
        const getTime = (item: any) => {
          if (!item.createdAt) return 0;
          if (typeof item.createdAt.toMillis === 'function') {
            return item.createdAt.toMillis();
          }
          if (item.createdAt.seconds !== undefined) {
            return item.createdAt.seconds * 1000 + ((item.createdAt.nanoseconds || 0) / 1000000);
          }
          if (item.createdAt instanceof Date) {
            return item.createdAt.getTime();
          }
          if (typeof item.createdAt === 'number') {
            return item.createdAt;
          }
          if (typeof item.createdAt === 'string') {
            const parsed = Date.parse(item.createdAt);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };
        return getTime(b) - getTime(a);
      });
      setEvents(sortedDocs);
    }, (error) => {
      console.error("Events listener error:", error);
    });

    const photosQuery = query(
      collection(db, 'massa_photos')
    );

    const unsubPhotos = onSnapshot(photosQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MassaPhoto[];
      // Sort in-memory safely to handle local pending timestamps and documents missing createdAt
      const sortedDocs = [...docs].sort((a, b) => {
        const getTime = (photo: MassaPhoto) => {
          if (!photo.createdAt) return 0;
          if (typeof photo.createdAt.toMillis === 'function') {
            return photo.createdAt.toMillis();
          }
          if (photo.createdAt.seconds !== undefined) {
            return photo.createdAt.seconds * 1000 + ((photo.createdAt.nanoseconds || 0) / 1000000);
          }
          if (photo.createdAt instanceof Date) {
            return photo.createdAt.getTime();
          }
          if (typeof photo.createdAt === 'number') {
            return photo.createdAt;
          }
          if (typeof photo.createdAt === 'string') {
            const parsed = Date.parse(photo.createdAt);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };
        return getTime(b) - getTime(a);
      });
      setMassaPhotos(sortedDocs);
    }, (error) => {
      console.error("Photos listener error:", error);
    });

    return () => {
      unsubSongs();
      unsubPlaylists();
      unsubEvents();
      unsubUsers();
      unsubPhotos();
      clearTimeout(timeout);
    };
  }, []);

  // Load and save draft
  useEffect(() => {
    if (viewMode === 'edit-song' && editingSong && !editingSong.id && (editingSong.title || editingSong.content)) {
      localStorage.setItem('songDraft', JSON.stringify(editingSong));
    }
  }, [editingSong, viewMode]);

  useEffect(() => {
    if (viewMode === 'edit-song') {
      const savedDraft = localStorage.getItem('songDraft');
      if (savedDraft && !editingSong?.id && !editingSong?.title && !editingSong?.content) {
        try {
          const draft = JSON.parse(savedDraft);
          setEditingSong(draft);
        } catch (e) {
          console.error("Erro ao carregar rascunho", e);
        }
      }
    }
  }, [viewMode]);

  const handleCancelEdit = () => {
    const hasContent = editingSong?.title || editingSong?.content || editingSong?.artist;
    if (hasContent && !editingSong?.id) {
      if (window.confirm('Você tem alterações não salvas. Deseja realmente descartar este rascunho?')) {
        localStorage.removeItem('songDraft');
        setEditingSong(null);
        setViewMode('songs');
      }
    } else {
      setEditingSong(null);
      setViewMode('songs');
    }
  };

  // Slide auto-play for mass photos
  useEffect(() => {
    if (slidePhotos.length <= 1) return;
    const interval = setInterval(() => {
      setActivePhotoSlide((prev) => (prev + 1) % slidePhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slidePhotos]);

  const handleCreateOrUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong || saving) return;

    if (!editingSong.content || editingSong.content.trim() === "") {
      alert("Por favor, preencha o conteúdo da cifra.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: editingSong.title || '',
        artist: editingSong.artist || '',
        content: (editingSong.content || '').toUpperCase(),
        category: editingSong.category || selectedCategory || 'Comum',
        youtubeUrl: editingSong.youtubeUrl || '',
        lineHeight: editingSong.lineHeight || 1.5,
        letterSpacing: editingSong.letterSpacing || 0,
        textAlign: editingSong.textAlign || 'left',
        ownerId: editingSong.id ? (editingSong.ownerId || 'Vilmardigital') : userIdentifier,
        updatedAt: serverTimestamp()
      };

      if (editingSong.id) {
        const currentSong = songs.find(s => s.id === editingSong.id);
        if (currentSong && !isMasterAdmin && currentSong.ownerId !== userIdentifier) {
          alert("Você só pode editar as cifras que você mesmo adicionou.");
          setSaving(false);
          return;
        }
        await updateDoc(doc(db, 'songs', editingSong.id), data);
      } else {
        await addDoc(collection(db, 'songs'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      localStorage.removeItem('songDraft');
      setEditingSong(null);
      setViewMode('songs');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'songs');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrUpdatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlaylist || saving) return;

    setSaving(true);
    try {
      const data = {
        title: editingPlaylist.title || 'Nova Playlist',
        date: editingPlaylist.date || '',
        songIds: editingPlaylist.songIds || [],
        transpositions: editingPlaylist.transpositions || {},
        ownerId: editingPlaylist.id ? editingPlaylist.ownerId : userIdentifier,
        updatedAt: serverTimestamp()
      };

      if (editingPlaylist.id) {
        if (!isMasterAdmin && editingPlaylist.ownerId !== userIdentifier) {
          alert('Apenas o administrador mestre ou o proprietário da playlist podem editá-la.');
          setSaving(false);
          return;
        }
        await updateDoc(doc(db, 'playlists', editingPlaylist.id), data);
      } else {
        await addDoc(collection(db, 'playlists'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setEditingPlaylist(null);
      setPlaylistSongSearchTerm('');
      setViewMode('playlist-list');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'playlists');
    } finally {
      setSaving(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSong = async (id: string) => {
    const songToDelete = songs.find(s => s.id === id);
    if (songToDelete && !isMasterAdmin && songToDelete.ownerId !== userIdentifier) {
      alert("Você só pode apagar as cifras que você mesmo adicionou.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'songs', id));
      setDeletingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `songs/${id}`);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsConvertingPhotos(true);
    setPhotoError(null);
    const filesArray = Array.from(files);
    
    const processedFiles: File[] = [];
    const processedPreviews: string[] = [];

    try {
      for (const file of filesArray) {
        const isHEIC = 
          file.name.toLowerCase().endsWith('.heic') || 
          file.name.toLowerCase().endsWith('.heif') || 
          file.type === 'image/heic' || 
          file.type === 'image/heif';

        if (isHEIC) {
          try {
            console.log(`Converting HEIC file to JPEG: ${file.name}`);
            // heic2any converts HEIC/HEIF to Blob/Blob[]
            const convertedResult = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.85
            });

            const blob = Array.isArray(convertedResult) ? convertedResult[0] : convertedResult;
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const convertedFile = new File([blob], newName, { type: "image/jpeg" });

            processedFiles.push(convertedFile);

            // Generate preview
            const previewUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(convertedFile);
            });
            processedPreviews.push(previewUrl);

          } catch (heicErr: any) {
            console.error("Failed to convert HEIC to JPEG, using original file:", heicErr);
            processedFiles.push(file);

            const previewUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            processedPreviews.push(previewUrl);
          }
        } else {
          processedFiles.push(file);

          const previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          processedPreviews.push(previewUrl);
        }
      }

      setNewPhotoFiles(prev => [...prev, ...processedFiles]);
      setNewPhotoPreviews(prev => [...prev, ...processedPreviews]);
    } catch (err: any) {
      console.error("Error processing selected photos:", err);
      setPhotoError("Erro ao processar/converter as fotos selecionadas.");
    } finally {
      setIsConvertingPhotos(false);
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleRemovePendingPhoto = (index: number) => {
    setNewPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhotoFiles.length === 0) return;
    setNewPhotoSaving(true);
    setPhotoError(null);
    setUploadProgress({ current: 0, total: newPhotoFiles.length });
    
    const today = new Date();
    const offset = -3; // UTC-3 Brasília
    const localDate = new Date(today.getTime() + offset * 3600 * 1000);
    const dateStr = localDate.toISOString().split("T")[0];
    const autoFormattedDate = formatPhotoDate(dateStr);

    try {
      for (let i = 0; i < newPhotoFiles.length; i++) {
        const file = newPhotoFiles[i];
        
        // 1. Compress image to super-lightweight JPEG Base64 Web-ready
        let base64Url = "";
        try {
          // Compress to 640px max-dimension and 0.45 quality so it saves fast and consumes very little bandwidth/space
          base64Url = await compressImage(file, 640, 0.45);
        } catch (compressErr) {
          console.warn("Compression failed, using fallback reader", compressErr);
          // Fallback to reading file normally if canvas-compressed fails
          base64Url = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = (errFileReader) => reject(errFileReader);
            r.readAsDataURL(file);
          });
        }

        // 2. Add document to Firestore directly (bypassing Firebase Storage API setup completely)
        await addDoc(collection(db, 'massa_photos'), {
          url: base64Url,
          date: autoFormattedDate,
          description: newPhotoDesc.trim() || '',
          storagePath: null,
          createdAt: serverTimestamp(),
          isBase64: true
        });

        // Short timeout to let UI update and separate sequential batch saves nicely
        await new Promise(resolve => setTimeout(resolve, 80));
        setUploadProgress({ current: i + 1, total: newPhotoFiles.length });
      }

      setNewPhotoFiles([]);
      setNewPhotoPreviews([]);
      setNewPhotoDesc('');
      setUploadProgress(null);
    } catch (err: any) {
      console.error("Error in handleCreatePhoto:", err);
      setPhotoError(err?.message || String(err) || "Erro ao salvar as fotos.");
    } finally {
      setNewPhotoSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, storagePath?: string) => {
    try {
      await deleteDoc(doc(db, 'massa_photos', photoId));
      if (storagePath && storage) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef).catch(err => {
          console.error("Error deleting from Storage (might not exist):", err);
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `massa_photos/${photoId}`);
    } finally {
      setConfirmingDeleteId(null);
    }
  };

  const handleDownloadPhoto = async (photoUrl: string, index: number, description?: string) => {
    try {
      const filename = description 
        ? `${description.replace(/[^a-z0-0]/gi, '_').toLowerCase()}.jpg` 
        : `foto_celebracao_${index + 1}.jpg`;

      if (photoUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = photoUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("Erro ao baixar a foto:", error);
      const link = document.createElement('a');
      link.href = photoUrl;
      link.target = "_blank";
      link.download = "foto.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    const playlistToDelete = playlists.find(p => p.id === id);
    if (playlistToDelete && !isMasterAdmin && playlistToDelete.ownerId !== userIdentifier) {
      alert("Você só pode apagar as playlists que você mesmo criou.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'playlists', id));
      setDeletingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `playlists/${id}`);
    }
  };

  const handleCreateAccessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin && userRole !== 'admin') {
      alert("Apenas administradores e o administrador mestre podem cadastrar novos usuários.");
      return;
    }
    if (!newUserName || !newUserPassword || saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'access_users'), {
        name: newUserName,
        password: newUserPassword,
        role: isMasterAdmin ? newUserRole : 'viewer',
        createdBy: userId || 'master',
        creatorName: userIdentifier,
        createdAt: serverTimestamp()
      });
      setNewUserName('');
      setNewUserPassword('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'access_users');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccessUser = async (id: string) => {
    if (!isMasterAdmin && userRole !== 'admin') {
      alert("Apenas administradores podem remover usuários.");
      return;
    }

    const userToRemove = accessUsers.find(u => u.id === id);
    if (!isMasterAdmin && userToRemove?.createdBy !== (userId || 'master')) {
      alert("Você só pode remover usuários que você mesmo cadastrou.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'access_users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `access_users/${id}`);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate.trim()) return;
    setEventSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        name: newEventName.trim(),
        date: newEventDate.trim(),
        createdAt: serverTimestamp()
      });
      setNewEventName('');
      setNewEventDate('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'events');
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Deseja realmente excluir este evento? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    }
  };

  const handleTransposeChange = async (songId: string, transpose: number) => {
    if (viewMode === 'view-playlist' && selectedPlaylist) {
      if (userIdentifier === 'Público') return; // Don't write to DB for public access profile
      try {
        const transpositions = { ...(selectedPlaylist.transpositions || {}) };
        transpositions[songId] = transpose;
        await updateDoc(doc(db, 'playlists', selectedPlaylist.id), {
          transpositions,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error saving transposition:", err);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-600"></div>
    </div>
  );

  if (!userRole || !userIdentifier) {
    return (
      <PasswordView 
        accessUsers={accessUsers}
        onUnlock={async (role, identifier, id, isMaster = false) => {
          const newSession = Math.random().toString(36).substring(2) + Date.now().toString(36);
          
          if (id) {
            try {
              await updateDoc(doc(db, 'access_users', id), {
                currentSessionId: newSession
              });
            } catch (err) {
              console.error("Error securing session:", err);
            }
          }

          setUserRole(role);
          setUserIdentifier(identifier);
          setUserId(id || null);
          setSessionId(newSession);
          setIsMasterAdmin(isMaster);
          localStorage.setItem('userRole', role);
          localStorage.setItem('userIdentifier', identifier);
          if (id) localStorage.setItem('userId', id);
          localStorage.setItem('sessionId', newSession);
          localStorage.setItem('isMasterAdmin', String(isMaster));
          setActiveTab('songs');
          setViewMode('categories');
          setSelectedCategory(null);
          setSearchTerm('');
        }} 
      />
    );
  }

  const currentUserDoc = accessUsers.find(u => u.name === userIdentifier || u.id === userId);

  const filteredSongs = songs
    .filter(s => {
      if (isMasterAdmin) return true;
      if (userRole === 'admin') return true;
      if (userRole === 'viewer') {
        if (userIdentifier === 'Público') {
          return true; // Public access has view permissions for all songs
        }
        const creatorName = currentUserDoc?.creatorName;
        const creatorId = currentUserDoc?.createdBy;
        const isFromMyCreator = creatorName && (s.ownerId === creatorName || s.ownerId === creatorId);
        const isMasterSong = !s.ownerId || s.ownerId === 'Vilmardigital' || s.ownerId === 'master';
        return isFromMyCreator || isMasterSong;
      }
      return true;
    })
    .filter(s => !selectedCategory || s.category === selectedCategory)
    .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredPlaylists = playlists
    .filter(p => {
      if (isMasterAdmin) return true;
      if (userRole === 'admin') {
        return p.ownerId === userIdentifier || p.ownerId === userId;
      }
      if (userRole === 'viewer') {
        if (userIdentifier === 'Público') {
          return true; // Public access has view permissions for all playlists
        }
        const creatorName = currentUserDoc?.creatorName;
        const creatorId = currentUserDoc?.createdBy;
        const isFromMyCreator = creatorName && (p.ownerId === creatorName || p.ownerId === creatorId);
        return isFromMyCreator;
      }
      return p.ownerId === userIdentifier || (!p.ownerId && userIdentifier === '4040');
    })
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Active songs for currently viewed playlist
  const playlistSongs = selectedPlaylist 
    ? selectedPlaylist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 to-white flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Background decoration elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-orange-100/50 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] -left-[10%] w-[40%] h-[40%] bg-orange-50/50 blur-[100px] rounded-full" />
      </div>
      {/* Header */}
      <header className="bg-white border-b border-orange-200 sticky top-0 z-30 shadow-xs flex flex-col">
        {/* Top layer: back, title, logout */}
        <div className="flex items-center justify-between px-4 py-2.5 min-h-[56px] relative w-full">
          {/* Left section: Back or Logo */}
          <div className="flex-1 flex items-center">
            {(activeTab !== 'liturgia' && activeTab !== 'recorder' && viewMode !== 'categories' && viewMode !== 'playlist-list') || (activeTab === 'songs' && viewMode === 'categories' && currentCategoryTab !== null) ? (
              <button 
                onClick={() => {
                  if (activeTab === 'songs' && viewMode === 'categories' && currentCategoryTab !== null) {
                    setCurrentCategoryTab(null);
                  } else if (viewMode === 'songs') {
                    setViewMode('categories');
                  } else if (viewMode === 'edit-song') {
                    handleCancelEdit();
                  } else if (viewMode === 'edit-playlist') {
                    setViewMode('playlist-list');
                  } else if (viewMode === 'view-playlist') {
                    setViewMode('playlist-list');
                  }
                }}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <div className="shrink-0 bg-white rounded-xl p-0.5 shadow-sm border border-emerald-200 bg-white">
                <Logo className="w-11 h-11" />
              </div>
            )}
          </div>

          {/* Centered Sophisticated Title with Lines (listras sofisticadas) */}
          <div className="flex-grow flex items-center justify-center gap-2 max-w-[60%]">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-orange-300 to-orange-500 opacity-60" />
            <h1 className="font-opensans font-extrabold text-sm sm:text-[17.5px] text-orange-850 uppercase tracking-widest px-2 whitespace-nowrap text-center">
              Louvemos ao Senhor
            </h1>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-orange-300 to-orange-500 opacity-60" />
          </div>

          {/* Right section: Logout */}
          <div className="flex-1 flex items-center justify-end">
            <button 
              onClick={handleLogout}
              className="p-2 -mr-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sophisticated Divisor Stripe / Listra fina decorativa */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-orange-600 to-transparent opacity-80" />

        {/* Bottom layer: Profile information side-by-side underneath */}
        <div className="bg-orange-50/25 px-4 py-2 border-t border-orange-100/30 flex items-center justify-center gap-2.5">
          <div className="flex items-center gap-2.5 max-w-full text-zinc-900">
            {/* Foto (Avatar upload) */}
            <label className={`relative group shrink-0 ${userIdentifier === 'Público' ? 'pointer-events-none' : 'cursor-pointer'}`} title={userIdentifier === 'Público' ? 'Perfil Público (Visitante)' : 'Mudar foto de perfil'}>
              {userIdentifier !== 'Público' && (
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                />
              )}
              <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 shadow-xs flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-500 group-active:scale-95">
                {userProfilePic && userIdentifier !== 'Público' ? (
                  <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className={`${userIdentifier === 'Público' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'} w-full h-full flex items-center justify-center font-bold text-xs`}>
                    {userIdentifier?.charAt(0).toUpperCase()}
                  </div>
                )}
                {userIdentifier !== 'Público' && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            </label>

            {/* Micro divisor line */}
            <div className="h-3.5 w-[1px] bg-orange-250" />

            {/* Nome e Local (Lado a lado) */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Nome */}
              <span className={`font-extrabold text-[11px] sm:text-xs tracking-tight truncate max-w-[120px] sm:max-w-[180px] uppercase ${userIdentifier === 'Público' ? 'text-emerald-700' : 'text-zinc-800'}`}>
                {userIdentifier || 'Louvemos ao Senhor'}
              </span>
              {userIdentifier === 'Público' && (
                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-200/55 shrink-0 uppercase tracking-widest">
                  Visitante
                </span>
              )}

              {/* Bullet divider */}
              <span className="text-orange-300 text-[10px] font-black">•</span>

              {/* Local (Current section) */}
              <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider bg-orange-100/60 px-2 py-0.5 rounded-md border border-orange-200/50 truncate max-w-[140px] sm:max-w-[200px]">
                {activeTab === 'liturgia' ? 'Liturgia Diária' :
                 activeTab === 'events_panel' ? 'Painel de Eventos' :
                 viewMode === 'categories' ? (currentCategoryTab === 'missa' ? 'Cifras para Missa' : currentCategoryTab === 'grupo' ? 'Grupo de Oração' : 'Menu Principal') :
                 viewMode === 'playlist-list' ? 'Playlists' :
                 viewMode === 'songs' ? selectedCategory : 
                 viewMode === 'edit-song' ? (editingSong?.id ? 'Editar Cifra' : 'Nova Cifra') :
                 viewMode === 'edit-playlist' ? (editingPlaylist?.id ? 'Editar Playlist' : 'Nova Playlist') :
                 viewMode === 'view-playlist' ? selectedPlaylist?.title : 
                 viewMode === 'manage-users' ? 'Gerenciar Usuários' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28">
        <AnimatePresence mode="wait">
          {/* CATEGORIES TAB: Categories View */}
          {activeTab === 'songs' && viewMode === 'categories' && (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              className="p-4"
            >
              {currentCategoryTab === null ? (
                /* Main Menu Dashboard */
                <div className="flex flex-col gap-4">
                  {/* Category Directory Selection Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Cifras para Missa */}
                    <button
                      onClick={() => setCurrentCategoryTab('missa')}
                      className="bg-gradient-to-br from-white to-orange-50/10 p-3.5 rounded-2xl border-2 border-orange-500 flex flex-col items-start gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all group active:scale-95 text-left relative overflow-hidden shadow-xs cursor-pointer"
                    >
                      <div className="absolute -right-1 -bottom-1 opacity-5 pointer-events-none transform scale-110">
                        <Church className="w-16 h-16 text-orange-600" />
                      </div>
                      <div className="bg-orange-600 text-white p-2.5 rounded-xl group-hover:scale-105 transition-transform shadow-md shadow-orange-500/20 shrink-0">
                        <Church className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-orange-950 text-xs sm:text-sm tracking-tight uppercase leading-tight">Cifras para Missa</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 leading-snug">
                          Entrada, Comunhão, etc.
                        </p>
                        <span className="inline-block mt-2 text-[9px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {songs.filter(s => CATEGORIES_MISSA.includes(s.category)).length} Cifras
                        </span>
                      </div>
                    </button>

                    {/* Option 2: Grupo de Oração */}
                    <button
                      onClick={() => setCurrentCategoryTab('grupo')}
                      className="bg-gradient-to-br from-white to-orange-50/10 p-3.5 rounded-2xl border-2 border-orange-500 flex flex-col items-start gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all group active:scale-95 text-left relative overflow-hidden shadow-xs cursor-pointer"
                    >
                      <div className="absolute -right-1 -bottom-1 opacity-5 pointer-events-none transform scale-110">
                        <Users className="w-16 h-16 text-orange-600" />
                      </div>
                      <div className="bg-orange-600 text-white p-2.5 rounded-xl group-hover:scale-105 transition-transform shadow-md shadow-orange-500/20 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-orange-950 text-xs sm:text-sm tracking-tight uppercase leading-tight">Grupo de Oração</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 leading-snug">
                          Reflexão, Louvores, etc.
                        </p>
                        <span className="inline-block mt-2 text-[9px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {songs.filter(s => CATEGORIES_GRUPO.includes(s.category)).length} Cifras
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Dynamic Slide Carousel on Main Page */}
                  <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-orange-50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-xl">
                          <Camera className="w-4 h-4 font-bold" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-orange-950 text-xs sm:text-sm uppercase tracking-tight leading-none">Momentos Especiais</h3>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Momentos das celebrações</p>
                        </div>
                      </div>
                    </div>

                    {slidePhotos.length > 0 ? (
                      <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden shadow-inner border border-orange-200 bg-orange-50/20">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {slidePhotos.map((photo, index) => {
                            if (index !== activePhotoSlide) return null;
                            return (
                              <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0 w-full h-full cursor-pointer group outline-none"
                                onClick={() => {
                                  setLightboxPhotos(slidePhotos);
                                  setLightboxIndex(index);
                                }}
                              >
                                <img 
                                  src={photo.url} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103" 
                                  alt={photo.description || "Foto da Celebração"} 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="bg-orange-600/90 text-white p-2.5 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Download className="w-5 h-5 animate-pulse" />
                                  </div>
                                </div>
                                {photo.description && (
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pt-10 flex flex-col justify-end z-10">
                                    <p className="font-extrabold text-xs sm:text-sm text-white leading-tight uppercase tracking-tight max-w-[90%] drop-shadow-xs">
                                      {photo.description}
                                    </p>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {/* Arrows */}
                        {slidePhotos.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoSlide((prev) => (prev - 1 + slidePhotos.length) % slidePhotos.length);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/45 hover:bg-orange-600 rounded-full text-white backdrop-blur-xs transition-colors cursor-pointer z-10"
                              aria-label="Foto anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoSlide((prev) => (prev + 1) % slidePhotos.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/45 hover:bg-orange-600 rounded-full text-white backdrop-blur-xs transition-colors cursor-pointer z-10"
                              aria-label="Proxima foto"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Indicators dots */}
                        {slidePhotos.length > 1 && (
                          <div className="absolute bottom-3 right-4 flex gap-1 z-10">
                            {slidePhotos.map((_, i) => (
                              <button
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePhotoSlide(i);
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                  i === activePhotoSlide ? 'bg-orange-600 w-3' : 'bg-white/50 hover:bg-white'
                                }`}
                                aria-label={`Slide ${i + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 flex flex-col items-center gap-2 bg-orange-50/10 border border-dashed border-orange-200 rounded-2xl">
                        <Image className="w-8 h-8 text-orange-250 animate-pulse" />
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider italic">Nenhum momento registrado nos últimos 4 dias.</p>
                      </div>
                    )}
                  </div>

                  {/* Mural de Notícias e Eventos */}
                  <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Mural de Notícias (Novas Músicas) */}
                    <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-orange-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-black text-orange-600 text-xs uppercase tracking-widest leading-none">Novas Músicas</h3>
                            <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Últimas adições à comunidade</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setMuralSongsExpanded(!muralSongsExpanded)}
                          className="p-1 hover:bg-orange-50 active:bg-orange-100 rounded-lg text-orange-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer animate-none"
                          aria-label="Alternar exibição de novas músicas"
                        >
                          {muralSongsExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {muralSongsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {newSongsLast48h.length === 0 ? (
                              <p className="text-xs text-gray-400 italic text-center py-6">Nenhuma música nova adicionada nas últimas 48h.</p>
                            ) : (
                              <div className="flex flex-col gap-2.5 pt-1">
                                {newSongsLast48h.slice(0, 4).map(song => (
                                  <div
                                    key={song.id}
                                    onClick={() => setViewingSong(song)}
                                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-orange-50/40 cursor-pointer border border-dashed border-orange-100 hover:border-orange-200 transition-all"
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-2.5 pr-2">
                                      <div className="shrink-0 text-orange-600 bg-orange-50 p-2 rounded-xl">
                                        {getCategoryIcon(song.category, "w-4 h-4")}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-sm text-gray-900 truncate tracking-tight">{song.title}</p>
                                        <p className="text-[9px] text-orange-600 font-black uppercase tracking-wider mt-0.5">{song.category}</p>
                                      </div>
                                    </div>
                                    <span className="text-[9px] bg-orange-100 text-orange-700 px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-widest shrink-0 cursor-pointer">
                                      Abrir
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Mural de Eventos */}
                    <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-orange-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-black text-orange-600 text-xs uppercase tracking-widest leading-none">Mural de Eventos</h3>
                            <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Próximas atividades e eventos</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setMuralEventsExpanded(!muralEventsExpanded)}
                          className="p-1 hover:bg-orange-50 active:bg-orange-100 rounded-lg text-orange-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer animate-none"
                          aria-label="Alternar exibição de eventos"
                        >
                          {muralEventsExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {muralEventsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {events.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <Calendar className="w-8 h-8 text-orange-200 mb-1" />
                                <p className="text-xs text-gray-400 italic">Nenhum evento adicionado recentemente.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2.5 max-h-[290px] overflow-y-auto pr-1 pt-1">
                                {events.map(event => (
                                  <div
                                    key={event.id}
                                    className="flex items-start gap-3 p-3 bg-gradient-to-br from-orange-50/20 to-orange-100/10 rounded-2xl border border-orange-100/40 relative shadow-xs"
                                  >
                                    <div className="bg-orange-600 text-white rounded-xl p-2 shrink-0">
                                      <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-black text-sm text-gray-900 leading-tight tracking-tight">{event.name}</p>
                                      <p className="text-[9px] font-black text-orange-700 mt-1.5 uppercase tracking-widest">{event.date}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ) : (
                /* Subcategory View (Inside Missa or Grupo) */
                <div className="flex flex-col gap-4">
                  {/* Category list tag context */}
                  <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-orange-950 uppercase tracking-widest">
                        {currentCategoryTab === 'missa' ? 'Celebração de Missa' : 'Encontro de Louvor'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {currentCategoryTab === 'missa' ? 'Cifras canônicas e cantos rituais ordinários' : 'Músicas para rebanho, oração e louvores'}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentCategoryTab(null)}
                      className="px-3 py-1.5 bg-white border border-orange-200 hover:border-orange-300 rounded-xl text-[10px] font-black text-orange-700 shadow-sm uppercase tracking-wider cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(currentCategoryTab === 'missa' ? CATEGORIES_MISSA : CATEGORIES_GRUPO).map(category => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setViewMode('songs');
                        }}
                        className="bg-white p-3.5 rounded-2xl border-2 border-orange-500 flex flex-col items-start gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all group active:scale-95 relative overflow-hidden text-left cursor-pointer"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none transform translate-x-2 -translate-y-2">
                          {getCategoryIcon(category, "w-12 h-12 text-orange-600")}
                        </div>
                        <div className="bg-orange-100 text-orange-600 p-1.5 rounded-lg group-hover:bg-orange-200 transition-colors backdrop-blur-sm border border-orange-200">
                          {getCategoryIcon(category, "w-4 h-4")}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-orange-950 text-sm leading-tight drop-shadow-sm">{category}</span>
                          <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider">
                            {songs.filter(s => s.category === category).length} CIFRAS
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* CATEGORIES TAB: Songs in Category */}
          {activeTab === 'songs' && viewMode === 'songs' && (
            <motion.div 
              key="songs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 flex flex-col gap-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Buscar cifra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>

              {filteredSongs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredSongs.map(song => (
                    <div 
                      key={song.id}
                      className="bg-white p-4 rounded-xl border border-orange-200 flex items-center justify-between group active:bg-gray-50"
                    >
                      <div 
                        onClick={() => setViewingSong(song)}
                        className="flex-1 cursor-pointer overflow-hidden flex items-center gap-3"
                      >
                        <div className="shrink-0 text-orange-700 bg-orange-50 p-2 rounded-lg">
                          {getCategoryIcon(song.category, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{song.title}</h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                              {song.category}
                            </span>
                            {song.ownerId && (
                              <>
                                <span className="text-gray-300 text-[10px]">•</span>
                                <span className="text-[10px] text-gray-400 font-semibold lowercase bg-gray-100 px-1.5 py-0.5 rounded">
                                  by {song.ownerId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {userRole === 'admin' && (isMasterAdmin || song.ownerId === userIdentifier) && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setEditingSong(song);
                              setViewMode('edit-song');
                            }}
                            className="p-2 text-gray-400 hover:text-orange-600"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {deletingId === song.id ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg"
                              >
                                Não
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSong(song.id);
                                }}
                                className="px-2 py-1 text-xs font-bold text-white bg-orange-600 rounded-lg shadow-sm"
                              >
                                Sim
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingId(song.id);
                              }}
                              className="p-2 text-gray-400 hover:text-orange-600 transition-colors z-10 cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <Music className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Nenhuma cifra encontrada</p>
                </div>
              )}
            </motion.div>
          )}

          {/* EDIT SONG FORM */}
          {viewMode === 'edit-song' && (
            <motion.div 
              key="edit-song"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4"
            >
              <form onSubmit={handleCreateOrUpdateSong} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Título</label>
                    <input 
                      type="text" 
                      required
                      value={editingSong?.title || ''}
                      onChange={e => setEditingSong({...editingSong, title: e.target.value})}
                      placeholder="Título da música"
                      className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Artista (Opcional)</label>
                    <input 
                      type="text" 
                      value={editingSong?.artist || ''}
                      onChange={e => setEditingSong({...editingSong, artist: e.target.value})}
                      placeholder="Nome do artista ou banda"
                      className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Categoria</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const query = `${editingSong?.title || ''} ${editingSong?.artist || ''} cifra`.trim();
                        if (query.length > 5) {
                          window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                        } else {
                          alert('Por favor, digite o título da música para pesquisar.');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-colors border border-orange-200 shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Procurar Cifra na Internet
                    </button>
                  </div>
                  <select 
                    value={editingSong?.category || selectedCategory || 'Comum'}
                    onChange={e => setEditingSong({...editingSong, category: e.target.value as Category})}
                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Link do YouTube (Opcional)</label>
                  <div className="relative">
                    <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      value={editingSong?.youtubeUrl || ''}
                      onChange={e => setEditingSong({...editingSong, youtubeUrl: e.target.value})}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white border border-orange-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Conteúdo (Cifras e Letras)</label>
                  </div>

                  {/* Opções de Formatação */}
                  <div className="flex flex-wrap gap-2 p-2 bg-orange-50/50 rounded-xl border border-orange-100 shadow-sm mb-3">
                    {/* Alinhamento */}
                    <div className="flex gap-1 border-r border-orange-200 pr-2">
                      <button 
                        type="button"
                        onClick={() => setEditingSong({...editingSong, textAlign: 'left'})}
                        className={`p-2 rounded-lg transition-all ${editingSong?.textAlign === 'left' || !editingSong?.textAlign ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-orange-100'}`}
                        title="Alinhar à Esquerda"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingSong({...editingSong, textAlign: 'center'})}
                        className={`p-2 rounded-lg transition-all ${editingSong?.textAlign === 'center' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-orange-100'}`}
                        title="Centralizar"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingSong({...editingSong, textAlign: 'right'})}
                        className={`p-2 rounded-lg transition-all ${editingSong?.textAlign === 'right' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-orange-100'}`}
                        title="Alinhar à Direita"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Espaçamento Vertical */}
                    <div className="flex items-center gap-2 border-r border-orange-200 pr-2">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ArrowUpDown className="w-2.5 h-2.5 text-orange-400" />
                          <span className="text-[8px] font-black text-orange-600">{(editingSong?.lineHeight || 1.5).toFixed(1)}</span>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            onClick={() => setEditingSong({...editingSong, lineHeight: Math.max(0.8, (editingSong?.lineHeight || 1.5) - 0.1)})} 
                            className="w-6 h-6 bg-white border border-orange-200 rounded-md hover:bg-orange-100 hover:text-orange-600 transition-all flex items-center justify-center text-[10px] font-black shadow-sm"
                          >
                            -
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingSong({...editingSong, lineHeight: Math.min(4, (editingSong?.lineHeight || 1.5) + 0.1)})} 
                            className="w-6 h-6 bg-white border border-orange-200 rounded-md hover:bg-orange-100 hover:text-orange-600 transition-all flex items-center justify-center text-[10px] font-black shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Espaçamento Horizontal */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ArrowLeftRight className="w-2.5 h-2.5 text-orange-400" />
                          <span className="text-[8px] font-black text-orange-600">{editingSong?.letterSpacing || 0}px</span>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            onClick={() => setEditingSong({...editingSong, letterSpacing: Math.max(-2, (editingSong?.letterSpacing || 0) - 1)})} 
                            className="w-6 h-6 bg-white border border-orange-200 rounded-md hover:bg-orange-100 hover:text-orange-600 transition-all flex items-center justify-center text-[10px] font-black shadow-sm"
                          >
                            -
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingSong({...editingSong, letterSpacing: Math.min(10, (editingSong?.letterSpacing || 0) + 1)})} 
                            className="w-6 h-6 bg-white border border-orange-200 rounded-md hover:bg-orange-100 hover:text-orange-600 transition-all flex items-center justify-center text-[10px] font-black shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      required
                      rows={15}
                      value={editingSong?.content || ''}
                      onChange={e => setEditingSong({...editingSong, content: e.target.value.toUpperCase()})}
                      placeholder="Cole aqui a cifra..."
                      className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm uppercase"
                      style={{ 
                        lineHeight: editingSong?.lineHeight || 1.5, 
                        letterSpacing: `${editingSong?.letterSpacing || 0}px`,
                        textAlign: editingSong?.textAlign || 'left'
                      }}
                    />
                    <p className="text-[11px] text-gray-500 font-medium">
                      💡 <strong>Dica de Paginação:</strong> Músicas muito extensas (com mais de 32 linhas) são divididas automaticamente em páginas sem recortar estrofes. Para forçar uma quebra de página manual e precisa, insira uma linha contendo apenas <code>---</code> ou <code>===</code>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 pb-10">
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-orange-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* PLAYLISTS TAB: Playlists List */}
          {activeTab === 'playlists' && viewMode === 'playlist-list' && (
            <motion.div 
              key="playlist-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 flex flex-col gap-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Buscar playlist..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>



              {filteredPlaylists.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredPlaylists.map(playlist => (
                    <div 
                      key={playlist.id}
                      className="bg-white p-5 rounded-2xl border border-orange-200 flex items-center justify-between active:bg-gray-50"
                    >
                      <div 
                        onClick={() => {
                          setSelectedPlaylist(playlist);
                          setViewMode('view-playlist');
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-bold text-gray-900 text-lg">{playlist.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                          <Music className="w-4 h-4" />
                          <span>{playlist.songIds.length} músicas</span>
                          {playlist.date && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(playlist.date).toLocaleDateString('pt-BR')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {userRole === 'admin' && (isMasterAdmin || playlist.ownerId === userIdentifier) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlaylist(playlist);
                              setPlaylistSongSearchTerm('');
                              setViewMode('edit-playlist');
                            }}
                            className="p-2 text-gray-400 hover:text-orange-600"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                        {userRole === 'admin' && (isMasterAdmin || playlist.ownerId === userIdentifier) && (
                          <>
                            {deletingId === playlist.id ? (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg"
                                >
                                  Não
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlaylist(playlist.id);
                                  }}
                                  className="px-2 py-1 text-xs font-bold text-white bg-orange-600 rounded-lg shadow-sm"
                                >
                                  Sim
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingId(playlist.id);
                                }}
                                className="p-2 text-gray-400 hover:text-orange-600 transition-colors z-10 cursor-pointer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <ListMusic className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Nenhuma playlist encontrada</p>
                </div>
              )}
            </motion.div>
          )}

          {/* PLAYLISTS TAB: View Playlist Songs */}
          {viewMode === 'view-playlist' && selectedPlaylist && (
            <motion.div 
              key="view-playlist"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4"
            >
              <div className="bg-orange-600 rounded-3xl p-6 mb-8 text-white shadow-xl shadow-orange-100 text-[13px] leading-[3px] h-[60px]">
                <h2 className="text-[16px] font-bold mb-2">{selectedPlaylist.title}</h2>
                <p className="opacity-80 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {selectedPlaylist.date ? new Date(selectedPlaylist.date).toLocaleDateString('pt-BR') : 'Sem data'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {playlistSongs.map((song, index) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      setCurrentPlaylistSongIndex(index);
                      setViewingSong(song);
                    }}
                    className="bg-white px-4 py-3 rounded-xl border border-orange-200 flex items-center gap-4 active:bg-gray-50 text-left hover:border-orange-200 transition-all min-h-[50px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 overflow-hidden flex items-center gap-3">
                      <div className="text-orange-600">
                        {getCategoryIcon(song.category, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-[14px]">{song.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{song.category}</p>
                          {song.ownerId && (
                            <span className="text-[10px] text-gray-400 font-semibold lowercase bg-gray-100 px-1.5 py-0.5 rounded">
                              by {song.ownerId}
                            </span>
                          )}
                          {selectedPlaylist.transpositions?.[song.id] !== undefined && selectedPlaylist.transpositions[song.id] !== 0 && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                              {selectedPlaylist.transpositions[song.id] > 0 ? `+${selectedPlaylist.transpositions[song.id]}` : selectedPlaylist.transpositions[song.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* EDIT PLAYLIST FORM */}
          {viewMode === 'edit-playlist' && (
            <motion.div 
              key="edit-playlist"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 flex flex-col gap-3"
            >
              <form onSubmit={handleCreateOrUpdatePlaylist} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-1">Título da Playlist</label>
                  <input 
                    type="text" 
                    required
                    value={editingPlaylist?.title || ''}
                    onChange={e => setEditingPlaylist({...editingPlaylist, title: e.target.value})}
                    placeholder="Missa de Domingo, etc."
                    className="w-full h-11 bg-white border-2 border-orange-200 rounded-xl px-4 py-2 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-1">Data</label>
                  <input 
                    type="date"
                    value={editingPlaylist?.date || ''}
                    onChange={e => setEditingPlaylist({...editingPlaylist, date: e.target.value})}
                    className="w-48 h-11 bg-white border-2 border-orange-200 rounded-xl px-4 py-2 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-sm"
                  />
                </div>


                
                <div className="mt-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Músicas Selecionadas ({editingPlaylist?.songIds?.length || 0})</label>
                  
                  <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 w-4 h-4" />
                    <input 
                      ref={playlistSearchRef}
                      type="text" 
                      placeholder="Localizar música..."
                      value={playlistSongSearchTerm}
                      onChange={(e) => setPlaylistSongSearchTerm(e.target.value)}
                      className="w-full h-10 bg-white border-2 border-orange-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2 max-h-[400px] overflow-auto bg-gray-100 p-2 rounded-2xl">
                    {songs
                      .filter(song => 
                        song.title.toLowerCase().includes(playlistSongSearchTerm.toLowerCase()) ||
                        song.category.toLowerCase().includes(playlistSongSearchTerm.toLowerCase())
                      )
                      .map(song => {
                      const isSelected = editingPlaylist?.songIds?.includes(song.id);
                      return (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => {
                            const currentIds = editingPlaylist?.songIds || [];
                            if (isSelected) {
                              setEditingPlaylist({...editingPlaylist, songIds: currentIds.filter(id => id !== song.id)});
                            } else {
                              setEditingPlaylist({...editingPlaylist, songIds: [...currentIds, song.id]});
                              setPlaylistSongSearchTerm('');
                              playlistSearchRef.current?.focus();
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-yellow-400 border-yellow-400 text-yellow-950 shadow-md' 
                              : 'bg-white border-orange-200 text-gray-900'
                          }`}
                        >
                          <div className="text-left flex items-center gap-3 overflow-hidden">
                            <div className={isSelected ? 'text-yellow-700' : 'text-orange-600'}>
                              {getCategoryIcon(song.category, "w-4 h-4")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{song.title}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-yellow-800' : 'text-gray-400'}`}>
                                  {song.category}
                                </p>
                                {song.ownerId && (
                                  <>
                                    <span className={`${isSelected ? 'text-yellow-700' : 'text-gray-300'} text-[8px]`}>•</span>
                                    <span className={`text-[8px] font-semibold lowercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-yellow-500/30 text-yellow-950' : 'bg-gray-100 text-gray-400'}`}>
                                      by {song.ownerId}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 pb-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setViewMode('playlist-list');
                      setPlaylistSongSearchTerm('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Playlist'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}





          {/* LITURGIA TAB */}
          {activeTab === 'liturgia' && (() => {
            const getCorLiturgicaDetails = (cor: string) => {
              const c = (cor || '').toLowerCase();
              if (c.includes('verd')) {
                return {
                  bg: 'bg-emerald-50 border-emerald-200',
                  text: 'text-emerald-800',
                  badge: 'bg-emerald-600 text-white',
                  label: 'Verde (Tempo Comum - Esperança)'
                };
              }
              if (c.includes('rox') || c.includes('violet') || c.includes('púrp') || c.includes('purp')) {
                return {
                  bg: 'bg-purple-50 border-purple-200',
                  text: 'text-purple-800',
                  badge: 'bg-purple-600 text-white',
                  label: 'Roxo (Penitência e Preparação)'
                };
              }
              if (c.includes('branc') || c.includes('alv')) {
                return {
                  bg: 'bg-amber-50/30 border-amber-200',
                  text: 'text-zinc-800',
                  badge: 'bg-amber-100 text-amber-900 border border-amber-200',
                  label: 'Branco (Alegria, Glória e Pureza)'
                };
              }
              if (c.includes('vermelh')) {
                return {
                  bg: 'bg-rose-50 border-rose-200',
                  text: 'text-rose-800',
                  badge: 'bg-rose-600 text-white',
                  label: 'Vermelho (Espírito Santo e Mártires)'
                };
              }
              if (c.includes('ros')) {
                return {
                  bg: 'bg-pink-50 border-pink-200',
                  text: 'text-pink-800',
                  badge: 'bg-pink-500 text-white',
                  label: 'Rosa (Gaudete / Laetare)'
                };
              }
              if (c.includes('pret')) {
                return {
                  bg: 'bg-zinc-100 border-zinc-300',
                  text: 'text-zinc-900',
                  badge: 'bg-zinc-800 text-white',
                  label: 'Preto (Luto e Finados)'
                };
              }
              return {
                bg: 'bg-orange-50 border-orange-200',
                text: 'text-orange-950',
                badge: 'bg-orange-600 text-white',
                label: cor || 'Outra Cor'
              };
            };

            const adjustDate = (days: number) => {
              const current = new Date(liturgiaDate + 'T12:00:00');
              current.setDate(current.getDate() + days);
              setLiturgiaDate(current.toISOString().split('T')[0]);
            };

            return (
              <motion.div
                key="liturgia"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="p-4 flex flex-col gap-4 text-gray-800 max-w-2xl mx-auto"
              >
                {/* Date Selection Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => adjustDate(-1)}
                      className="p-2.5 rounded-xl hover:bg-orange-50 border border-orange-100 text-orange-600 transition-colors active:scale-95 duration-100"
                      title="Dia Anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-col items-center flex-1 text-center min-w-0">
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-orange-600">
                        Calendário Litúrgico
                      </span>
                      <span className="font-extrabold text-zinc-800 truncate text-sm sm:text-base">
                        {liturgiaData?.readableDate || "Buscando data..."}
                      </span>
                    </div>

                    <button
                      onClick={() => adjustDate(1)}
                      className="p-2.5 rounded-xl hover:bg-orange-50 border border-orange-100 text-orange-600 transition-colors active:scale-95 duration-100"
                      title="Próximo Dia"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2 items-center justify-center">
                    <input
                      type="date"
                      value={liturgiaDate}
                      onChange={(e) => setLiturgiaDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-orange-50 border border-orange-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => {
                        const today = new Date();
                        const offset = -3;
                        const localDate = new Date(today.getTime() + offset * 3600 * 1000);
                        setLiturgiaDate(localDate.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 text-xs font-extrabold text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors active:scale-95"
                    >
                      Hoje
                    </button>
                  </div>
                </div>

                {/* Loading Banner */}
                {liturgiaLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                      <Church className="w-5 h-5 text-orange-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-700">Lendo as Escrituras...</p>
                      <p className="text-xs text-gray-400 mt-1">Conectando ao banco de dados litúrgico católico</p>
                    </div>
                  </div>
                )}

                {/* Connection Error Banner */}
                {!liturgiaLoading && liturgiaError && (
                  <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center flex flex-col items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-full text-red-600">
                      <Info className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-red-900 text-base">Falha ao Buscar</h3>
                    <p className="text-sm text-red-700 max-w-md">
                      {liturgiaError}
                    </p>
                    <button
                      onClick={() => {
                        setLiturgiaDate(prev => prev);
                      }}
                      className="mt-2 bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-red-700 transition-colors"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}

                {/* Presenting Information Panels */}
                {!liturgiaLoading && !liturgiaError && liturgiaData && (() => {
                  const corInfo = getCorLiturgicaDetails(liturgiaData.corLiturgica);
                  return (
                    <div className="flex flex-col gap-4">
                      {/* Liturgical Celebration Header Panel */}
                      <div className={`rounded-3xl p-6 border shadow-sm transition-all ${corInfo.bg}`}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${corInfo.badge}`}>
                            {corInfo.label}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            {liturgiaData.tempoLiturgico}
                          </span>
                        </div>
                        
                        <h2 className="font-extrabold text-zinc-900 text-lg sm:text-xl tracking-tight leading-snug">
                          {liturgiaData.celebracao}
                        </h2>
                      </div>

                      {/* Santo do Dia Panel */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 flex flex-col gap-3">
                        <div className="flex items-center gap-3 border-b border-orange-50 pb-3">
                          <div className="bg-amber-100/50 text-amber-600 p-2 rounded-xl">
                            <Crown className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-zinc-900 text-sm">Santo do Dia</h3>
                            <p className="text-[10px] text-zinc-500 italic mt-0.5 font-medium leading-tight truncate">
                              &ldquo;{liturgiaData.santoDoDiaResumo}&rdquo;
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-zinc-650 leading-relaxed whitespace-pre-line text-justify max-h-56 overflow-y-auto pr-1">
                          {liturgiaData.santoDoDia}
                        </div>
                      </div>

                      {/* Biblical Readings Panel */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-orange-50 pb-2">
                          <div className="bg-orange-100/50 text-orange-600 p-2 rounded-xl">
                            <Wand2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-zinc-900 text-sm">Leituras Oficiais da Liturgia</h3>
                            <p className="text-[10px] text-gray-400">Proclamação bíblica sugerida para hoje no Brasil</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {Array.isArray(liturgiaData.leituras) ? (
                            liturgiaData.leituras.map((leitura: string, index: number) => (
                              <div 
                                key={index} 
                                className="flex items-start gap-2.5 bg-orange-50/40 border border-orange-100/50 px-3.5 py-2.5 rounded-xl text-xs hover:bg-orange-100/30 transition-all shadow-sm"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0 animate-pulse" />
                                <span className="font-bold text-zinc-800 leading-tight">{leitura}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">Pesquisando as leituras...</p>
                          )}
                        </div>

                        {/* Executed Gospel text fully proclaimed */}
                        <div className="mt-2 bg-amber-50/25 border border-amber-100 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
                          <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-2">
                            <span className="text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                              Evangelho Proclamado
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                              {liturgiaData.evangelhoTitulo}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-700 leading-relaxed italic text-justify whitespace-pre-line bg-white/70 p-3.5 rounded-xl border border-amber-50 shadow-inner">
                            {liturgiaData.evangelhoTexto}
                          </p>
                        </div>
                      </div>

                      {/* Homily reflection panel */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 flex flex-col gap-3">
                        <div className="flex items-center gap-3 border-b border-orange-50 pb-3">
                          <div className="bg-emerald-100/50 text-emerald-600 p-2 rounded-xl">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-zinc-900 text-sm">Reflexão Prática Diária</h3>
                            <p className="text-[10px] text-gray-400">Nutrição espiritual para inspirar orações e cantos</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-zinc-650 leading-relaxed text-justify whitespace-pre-line">
                          {liturgiaData.reflexao}
                        </div>
                      </div>

                      {/* Devotional Prayer block */}
                      <div className="bg-gradient-to-tr from-amber-50/60 to-orange-50/60 border border-amber-100 rounded-3xl p-6 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-800">
                          <Church className="w-5 h-5 shrink-0" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider">Oração Espiritual</h4>
                        </div>
                        <blockquote className="text-zinc-700 italic text-xs leading-relaxed text-center font-medium">
                          &ldquo;{liturgiaData.oracao}&rdquo;
                        </blockquote>
                      </div>

                      {/* Citations Grounding Sources and references link */}
                      {liturgiaData.sources && liturgiaData.sources.length > 0 && (
                        <div className="flex flex-col gap-2 p-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                            Referências Autênticas de Busca
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {liturgiaData.sources.slice(0, 3).map((source: any, idx: number) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noreferrer"
                                className="text-[10px] text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 border border-orange-100/60 shadow-sm hover:-translate-y-0.5"
                              >
                                <span>{source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}</span>
                                <ExternalLink className="w-3 h-3 text-orange-500" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            );
          })()}

          {/* PHOTOS GALLERY TAB */}
          {activeTab === 'photos' && (
            <motion.div
              key="photos-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 flex flex-col gap-6"
            >
              <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-orange-950 uppercase tracking-widest">
                    Álbum de Fotos
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase">
                    Biblioteca de lembranças de nossas celebrações
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('songs');
                    setViewMode('categories');
                  }}
                  className="px-3 py-1.5 bg-white border border-orange-200 hover:border-orange-300 rounded-xl text-[10px] font-black text-orange-700 shadow-xs uppercase tracking-wider cursor-pointer"
                >
                  Voltar
                </button>
              </div>

              {/* ADMIN FORM: Upload Multi-Fotos */}
              {isMasterAdmin && (
                <div className="bg-white border border-orange-200 rounded-3xl p-5 shadow-xs">
                  <div className="flex items-center gap-3 mb-6 pb-2.5 border-b border-orange-100">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                      <Camera className="w-5 h-5 font-bold" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-orange-950 text-sm uppercase animate-none">Carregar Novas Fotos</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Selecione e envie várias fotos de uma só vez</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreatePhoto} className="flex flex-col gap-4">
                    {/* Multi-Photo Input Area */}
                    <div>
                      <label className="block text-[11px] font-black text-orange-850 uppercase tracking-widest mb-1.5">
                        Selecionar fotos (HEIC do iPhone aceito)
                      </label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-2xl p-6 bg-orange-50/20 hover:border-orange-400 transition-all cursor-pointer relative min-h-[140px]">
                        {isConvertingPhotos ? (
                          <div className="text-center flex flex-col items-center gap-3">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full animate-spin">
                              <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-orange-950 uppercase tracking-wider">Otimizando imagens...</p>
                              <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Convertendo HEIC para JPEG leve</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              required={newPhotoFiles.length === 0}
                              onChange={handlePhotoSelect}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            />
                            <div className="text-center flex flex-col items-center gap-2">
                              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-full">
                                <Plus className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-700">Selecione fotos da celebração</p>
                                <p className="text-[10px] text-gray-400 font-medium">Toque ou arraste os arquivos juntos</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Previews Grid list */}
                    {newPhotoPreviews.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            Fotos selecionadas ({newPhotoPreviews.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPhotoFiles([]);
                              setNewPhotoPreviews([]);
                            }}
                            className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Limpar todas
                          </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[180px] overflow-y-auto p-1.5 bg-orange-50/20 border border-orange-100 rounded-2xl">
                          {newPhotoPreviews.map((preview, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group shadow-xs">
                              <img src={preview} alt="Prévia" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemovePendingPhoto(idx)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors cursor-pointer"
                                title="Remover"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description/Label input */}
                    <div>
                      <label className="block text-[11px] font-black text-orange-850 uppercase tracking-widest mb-1.5">
                        Momento da Celebração / Descrição
                      </label>
                      <input
                        type="text"
                        value={newPhotoDesc}
                        onChange={(e) => setNewPhotoDesc(e.target.value)}
                        placeholder="Ex: Procissão de Entrada, Ofertório, Comunhão, Benção..."
                        className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-zinc-900 placeholder:text-gray-400 animate-none"
                      />
                    </div>

                    {/* Progress indicators */}
                    {uploadProgress && (
                      <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3.5 flex flex-col gap-2 mt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                          <span>Sincronizando fotos com o álbum...</span>
                          <span className="font-extrabold text-orange-700">
                            {uploadProgress.current} de {uploadProgress.total} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className="bg-orange-600 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {photoError && (
                      <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-2xl text-[11px] font-black uppercase tracking-wide flex flex-col gap-1">
                        <span>Erro ao carregar fotos:</span>
                        <span className="text-[10px] font-bold text-gray-500 normal-case">{photoError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={newPhotoSaving || newPhotoFiles.length === 0}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-2xl py-3 font-extrabold text-xs uppercase tracking-widest shadow-md shadow-orange-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {newPhotoSaving ? (
                        <span>Enviando fotos...</span>
                      ) : (
                        <span>Adicionar {newPhotoFiles.length > 0 ? `${newPhotoFiles.length} fotos simultâneas` : 'Fotos'} ao álbum</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Photos Gallery View Grid */}
              <div className="bg-white border border-orange-200 rounded-3xl p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-5 pb-2 border-b border-orange-150">
                  <div className="p-1 px-2.5 bg-orange-100 text-orange-600 rounded-lg text-xs font-black uppercase">
                    Mural de Fotos
                  </div>
                  <div>
                    <h3 className="font-extrabold text-orange-950 text-sm uppercase">Momentos Registrados ({massaPhotos.length})</h3>
                  </div>
                </div>

                {massaPhotos.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2">
                    <Image className="w-10 h-10 text-orange-200 animate-pulse" />
                    <p className="text-xs text-gray-400 italic">Nenhum momento registrado na galeria ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {massaPhotos.map((photo, index) => (
                      <div 
                        key={photo.id}
                        className="group border border-orange-100 rounded-2xl overflow-hidden bg-orange-50/10 shadow-xs relative aspect-square cursor-pointer"
                        onClick={() => {
                          setLightboxPhotos(massaPhotos);
                          setLightboxIndex(index);
                        }}
                      >
                        <img 
                          src={photo.url} 
                          alt={photo.description || "Momento da Celebração"} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-350"
                          referrerPolicy="no-referrer"
                        />
                        {photo.description && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2.5 pt-6 flex flex-col justify-end">
                            <p className="text-[10px] sm:text-[11px] font-black text-white leading-tight uppercase tracking-tight truncate group-hover:whitespace-normal group-hover:overflow-visible drop-shadow-xs">
                              {photo.description}
                            </p>
                          </div>
                        )}
                        {isMasterAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1 z-10">
                            {confirmingDeleteId === photo.id ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(photo.id, photo.storagePath);
                                  }}
                                  className="px-2 py-1.5 bg-red-650 hover:bg-red-600 text-white font-extrabold text-[10px] rounded-lg tracking-wider uppercase shadow-md cursor-pointer select-none"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmingDeleteId(null);
                                  }}
                                  className="px-2 py-1.5 bg-zinc-850 hover:bg-zinc-700 text-white font-extrabold text-[10px] rounded-lg tracking-wider uppercase shadow-md cursor-pointer select-none"
                                >
                                  Não
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingDeleteId(photo.id);
                                }}
                                className="p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white backdrop-blur-xs transition-colors cursor-pointer shadow-sm"
                                title="Excluir Foto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* RECORDER TAB */}
          {activeTab === 'recorder' && (
            <motion.div
              key="recorder-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 overflow-y-auto"
            >
              <VoiceRecorder />
            </motion.div>
          )}

          {/* USER MANAGEMENT TAB (Admin only) */}
          {activeTab === 'users' && userRole === 'admin' && (
            <motion.div
              key="manage-users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 flex flex-col gap-6"
            >
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-600 p-2 rounded-xl">
                    <Crown className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg tracking-tight">Gerenciar Acessos</h2>
                    <p className="text-xs text-gray-500">
                      Crie novos usuários e senhas de acesso
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateAccessUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nome do Usuário</label>
                    <input 
                      type="text"
                      required
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                    <input 
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      placeholder="Senha numérica ou texto"
                      className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  {isMasterAdmin && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nível de Acesso</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewUserRole('viewer')}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                            newUserRole === 'viewer' 
                              ? 'bg-orange-600 text-white shadow-md font-black' 
                              : 'bg-orange-50 text-orange-600'
                          }`}
                        >
                          Visualizador
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewUserRole('admin')}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                            newUserRole === 'admin' 
                              ? 'bg-orange-600 text-white shadow-md font-black' 
                              : 'bg-orange-50 text-orange-600'
                          }`}
                        >
                          Administrador
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewUserRole('master')}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                            newUserRole === 'master' 
                              ? 'bg-orange-600 text-white shadow-md font-black border-2 border-orange-300' 
                              : 'bg-orange-50 text-orange-600'
                          }`}
                        >
                          Master (Acesso Total)
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all"
                  >
                    {saving ? 'Criando...' : 'Cadastrar Usuário'}
                  </button>
                </form>
              </div>

              <div className="space-y-4 pb-28">
                 {(() => {
                   const displayedUsers = accessUsers.filter(user => {
                     if (isMasterAdmin) return true;
                     return user.createdBy === (userId || 'master');
                   });
                   return (
                     <>
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                         Usuários Cadastrados ({displayedUsers.length})
                       </h3>
                       {displayedUsers.map(user => {
                         const isOnline = user.isOnline === true && user.lastActive && (Date.now() - user.lastActive < 45000);

                         return (
                           <div key={user.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                             <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-xl ${
                                 user.role === 'master' 
                                   ? 'bg-rose-100 text-rose-600 border border-rose-200 shadow-xs' 
                                   : user.role === 'admin' 
                                     ? 'bg-orange-100 text-orange-600' 
                                     : 'bg-gray-100 text-gray-600'
                               }`}>
                                 {user.role === 'master' ? <Crown className="w-5 h-5 stroke-[2.5]" /> : user.role === 'admin' ? <Crown className="w-5 h-5" /> : <Mic2 className="w-5 h-5" />}
                               </div>
                               <div>
                                 <h4 className="font-bold text-gray-900">{user.name}</h4>
                                 <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                                     user.role === 'master' 
                                       ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                       : user.role === 'admin' 
                                         ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                         : 'bg-gray-50 text-gray-600 border-gray-100'
                                   }`}>
                                     {user.role === 'master' ? 'Master (Acesso Total)' : user.role === 'admin' ? 'Administrador' : 'Visualizador'}
                                   </span>
                                   {(isMasterAdmin || user.createdBy === (userId || 'master')) && (
                                     <p className="text-[11px] text-gray-400 font-medium ml-1">
                                       Senha: <span className="font-mono text-gray-600">{user.password}</span>
                                     </p>
                                   )}
                                 </div>
                               </div>
                             </div>

                             <div className="flex items-center justify-between sm:justify-end gap-2.5 ml-11 sm:ml-0">
                               {/* Status Luz (Verde quando logado / Vermelho quando deslogado) */}
                               <button
                                 type="button"
                                 onClick={async () => {
                                   if (isOnline) {
                                     const confirmKick = window.confirm(`Deseja forçar a desconexão da sessão ativa de "${user.name}"?`);
                                     if (confirmKick) {
                                       try {
                                         await updateDoc(doc(db, 'access_users', user.id), {
                                           isOnline: false,
                                           currentSessionId: 'kick_' + Date.now()
                                         });
                                         alert(`Usuário "${user.name}" foi desconectado.`);
                                       } catch (error) {
                                         console.error("Erro ao derrubar sessão:", error);
                                       }
                                     }
                                   } else {
                                     alert(`Status: "${user.name}" está deslogado.`);
                                   }
                                 }}
                                 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer select-none active:scale-95 ${
                                   isOnline 
                                     ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-[0_0_8px_rgba(34,197,94,0.1)]' 
                                     : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                 }`}
                                 title={isOnline ? "Clique para derrubar a conexão deste usuário" : "Usuário deslogado"}
                               >
                                 <span className="relative flex h-2 w-2">
                                   {isOnline && (
                                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                   )}
                                   <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                 </span>
                                 <span>
                                   {isOnline ? 'Logado' : 'Deslogado'}
                                 </span>
                               </button>

                               {(isMasterAdmin || user.createdBy === (userId || 'master')) && (
                                 <button
                                   onClick={() => handleRemoveAccessUser(user.id)}
                                   className="p-2 text-gray-300 hover:text-orange-600 transition-colors"
                                   title="Remover acesso"
                                 >
                                   <X className="w-5 h-5" />
                                 </button>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </>
                   );
                 })()}
             </div>
           </motion.div>
         )}

         {/* EVENTS MANAGEMENT TAB (Admin only) */}
         {activeTab === 'events_panel' && isMasterAdmin && (
            <motion.div 
              key="events_panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4"
            >
              <div className="bg-white border border-orange-200 rounded-3xl p-5 shadow-sm max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-orange-100">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-orange-950 text-md uppercase">Novo Evento / Atividade</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">Adicionar um novo aviso ou data ao mural</p>
                  </div>
                </div>

                <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-orange-850 uppercase tracking-widest mb-1.5">
                      Nome do Evento
                    </label>
                    <input
                      type="text"
                      required
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="Ex: Noite de Louvor e Clamor"
                      className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-orange-850 uppercase tracking-widest mb-1.5">
                      Data ou Horário do Evento
                    </label>
                    <input
                      type="text"
                      required
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      placeholder="Ex: Terça-feira, 03/12 às 19:30h"
                      className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-zinc-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={eventSaving}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-2xl py-3 font-extrabold text-xs uppercase tracking-widest shadow-md shadow-orange-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {eventSaving ? 'Salvando...' : 'Adicionar ao Mural'}
                  </button>
                </form>
              </div>

              {/* Listed Events */}
              <div className="bg-white border border-orange-200 rounded-3xl p-5 shadow-sm max-w-lg mx-auto mt-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-orange-100">
                  <h3 className="font-bold text-gray-950 text-xs uppercase tracking-widest">Eventos Ativos</h3>
                </div>

                {events.length === 0 ? (
                  <p className="text-xs text-gray-405 italic text-center py-6">Nenhum evento agendado recentemente.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {events.map(event => (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-3.5 bg-orange-50/20 rounded-2xl border border-orange-100/60"
                      >
                        <div className="min-w-0 pr-2 flex-1 text-left">
                          <p className="font-extrabold text-sm text-gray-900 tracking-tight leading-tight">{event.name}</p>
                          <p className="text-[10px] font-bold text-orange-700 mt-1 uppercase tracking-wider">{event.date}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* Floating Action Buttons */}
      {viewMode === 'songs' && !editingSong && userRole === 'admin' && (
        <button 
          onClick={() => {
            setEditingSong({});
            setViewMode('edit-song');
          }}
          className="fixed right-6 bottom-20 w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {activeTab === 'playlists' && viewMode === 'playlist-list' && userRole === 'admin' && (
        <button 
          onClick={() => {
            setEditingPlaylist({ songIds: [], transpositions: {} });
            setPlaylistSongSearchTerm('');
            setViewMode('edit-playlist');
          }}
          className="fixed right-6 bottom-20 w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-2 left-4 right-4 bg-orange-600 rounded-[28px] flex justify-around p-2 z-40 shadow-2xl shadow-orange-600/30">
        <button 
          onClick={() => {
            setActiveTab('songs');
            setViewMode('categories');
          }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'songs' ? 'text-white' : 'text-orange-200'}`}
        >
          <Music className="w-5 h-5" />
          <span className="text-[8px] font-extrabold uppercase tracking-tight">Cifras</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('playlists');
            setViewMode('playlist-list');
          }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'playlists' ? 'text-white' : 'text-orange-200'}`}
        >
          <ListMusic className="w-5 h-5" />
          <span className="text-[8px] font-extrabold uppercase tracking-tight">Playlists</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('liturgia');
            setViewMode('categories'); // fallback safe viewMode
          }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'liturgia' ? 'text-white' : 'text-orange-200'}`}
        >
          <Church className="w-5 h-5" />
          <span className="text-[8px] font-extrabold uppercase tracking-tight">Liturgia</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('recorder');
            setViewMode('recorder');
          }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'recorder' ? 'text-white' : 'text-orange-200'}`}
        >
          <Mic className="w-5 h-5" />
          <span className="text-[8px] font-extrabold uppercase tracking-tight">Gravador</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('photos');
            setViewMode('photos');
          }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'photos' ? 'text-white' : 'text-orange-200'}`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[8px] font-extrabold uppercase tracking-tight">Fotos</span>
        </button>




        {/* Suggestions Tab */}
        {userRole === 'admin' && (
          <button 
            onClick={() => {
              setActiveTab('users');
              setViewMode('manage-users');
            }}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'users' ? 'text-white' : 'text-orange-200'}`}
          >
            <Lock className="w-5 h-5" />
            <span className="text-[8px] font-extrabold uppercase tracking-tight">Acessos</span>
          </button>
        )}

        {isMasterAdmin && (
          <button 
            onClick={() => {
              setActiveTab('events_panel');
              setViewMode('events_panel');
            }}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeTab === 'events_panel' ? 'text-white' : 'text-orange-200'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[8px] font-extrabold uppercase tracking-tight">Eventos</span>
          </button>
        )}
      </nav>

      {/* Modals Cleaned Up */}

      {/* Full Screen Song Viewer */}
      <AnimatePresence>
        {viewingSong && (
          <FullScreenSong 
            song={viewingSong} 
            onClose={() => setViewingSong(null)} 
            initialTranspose={viewMode === 'view-playlist' && selectedPlaylist ? (selectedPlaylist.transpositions?.[viewingSong.id] || 0) : 0}
            onTransposeChange={(val) => handleTransposeChange(viewingSong.id, val)}
            onPrev={currentPlaylistSongIndex > 0 && viewMode === 'view-playlist' ? () => {
              const prevIndex = currentPlaylistSongIndex - 1;
              setCurrentPlaylistSongIndex(prevIndex);
              setViewingSong(playlistSongs[prevIndex]);
            } : undefined}
            onNext={currentPlaylistSongIndex < playlistSongs.length - 1 && viewMode === 'view-playlist' ? () => {
              const nextIndex = currentPlaylistSongIndex + 1;
              setCurrentPlaylistSongIndex(nextIndex);
              setViewingSong(playlistSongs[nextIndex]);
            } : undefined}
          />
        )}

        {/* Interactive Photo Lightbox */}
        {lightboxIndex !== null && lightboxPhotos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-between p-4 backdrop-blur-md select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Lightbox Header */}
            <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-white/10 z-10">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-400 stroke-[2.5]" />
                <span className="font-black text-xs uppercase tracking-widest text-orange-405">
                  Visualizar Foto
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold">
                  {lightboxIndex + 1} de {lightboxPhotos.length}
                </span>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleDownloadPhoto(lightboxPhotos[lightboxIndex].url, lightboxIndex, lightboxPhotos[lightboxIndex].description)}
                  className="p-2 sm:px-4 sm:py-2 bg-orange-655 hover:bg-orange-500 rounded-full sm:rounded-xl text-white flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Baixar Foto"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Baixar</span>
                </button>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 bg-white/10 hover:bg-red-650 rounded-full text-white transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Interactive Visualizer */}
            <div className="flex-grow w-full max-w-5xl flex items-center justify-between gap-4 py-4 relative" onClick={e => e.stopPropagation()}>
              {/* Left Arrow Button */}
              {lightboxPhotos.length > 1 && (
                <button
                  onClick={() => setLightboxIndex(prev => (prev !== null ? (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length : 0))}
                  className="p-3 bg-white/5 hover:bg-orange-650 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer absolute sm:static left-2 z-10 border border-white/5 active:scale-90"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[3]" />
                </button>
              )}

              {/* Centered Image Frame with Fade/Zoom Transition Animation */}
              <div className="flex-1 h-full flex flex-col justify-center items-center relative overflow-hidden">
                <motion.img
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  src={lightboxPhotos[lightboxIndex].url}
                  alt={lightboxPhotos[lightboxIndex].description || "Visualização da Foto"}
                  className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/5"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Right Arrow Button */}
              {lightboxPhotos.length > 1 && (
                <button
                  onClick={() => setLightboxIndex(prev => (prev !== null ? (prev + 1) % lightboxPhotos.length : 0))}
                  className="p-3 bg-white/5 hover:bg-orange-650 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer absolute sm:static right-2 z-10 border border-white/5 active:scale-90"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="w-6 h-6 stroke-[3]" />
                </button>
              )}
            </div>

            {/* Description Card & Download Bar at the Bottom */}
            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between mb-2 z-10 backdrop-blur-md" onClick={e => e.stopPropagation()}>
              <div className="flex-1">
                <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest leading-none mb-1">
                  Momento Registrado
                </p>
                <p className="text-sm font-bold text-white tracking-wide uppercase">
                  {lightboxPhotos[lightboxIndex].description || "Momento da Celebração"}
                </p>
                {lightboxPhotos[lightboxIndex].date && (
                  <p className="text-[10.5px] text-gray-400 font-semibold mt-1">
                    Celebração de: <span className="text-orange-100 font-bold">{formatPhotoDate(lightboxPhotos[lightboxIndex].date)}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDownloadPhoto(lightboxPhotos[lightboxIndex].url, lightboxIndex, lightboxPhotos[lightboxIndex].description)}
                className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-505 hover:to-orange-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform hover:scale-102 active:scale-98 cursor-pointer border border-orange-400/20"
              >
                <Download className="w-4 h-4 animate-bounce" />
                Baixar Alta Resolução
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

