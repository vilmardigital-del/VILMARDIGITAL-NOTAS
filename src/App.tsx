import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged
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
  Heart,
  Sun,
  Crown,
  Mic2,
  Gift,
  DoorOpen,
  Flag,
  Music, 
  Plus, 
  Search, 
  ChevronLeft, 
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
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Copy,
  Clipboard,
  CaseLower,
  ArrowLeftRight,
  ArrowUpDown,
  Play,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from './lib/firebase';
import { CATEGORIES, Category, Song, Playlist, LiturgicalTime, LITURGICAL_TIMES, AccessUser } from './types';
import { getGoogleSearchUrl, getMusicSuggestionsSearchUrl, LITURGY_SOURCES } from './services/suggestionsService';

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
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#f97316" className="opacity-60" />;
      })}
      {/* Medalha e Cruz na parte de baixo */}
      <circle cx="50" cy="94" r="3" fill="#f97316" />
      <path d="M50 96 L50 103" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 99 L53 99" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
    
    {/* Guitar Pick Shape SVG */}
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-[80%] h-[80%] left-[10%] top-[8%] drop-shadow-sm">
      <path 
        d="M 10 32 C 10 15 25 2 50 2 C 75 2 90 15 90 32 C 90 55 65 92 50 98 C 35 92 10 55 10 32 Z" 
        fill="#f97316" 
      />
    </svg>
    <Music className="relative z-10 w-[35%] h-[35%] text-white -translate-y-1" />
  </div>
);

const PasswordView = ({ onUnlock, accessUsers }: { onUnlock: (role: 'admin' | 'viewer', identifier: string, id?: string) => void, accessUsers: AccessUser[] }) => {
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
      onUnlock(foundUser.role, foundUser.name, foundUser.id);
      return;
    }

    // Fallback to fixed credentials
    if (normalizedUsername.toLowerCase() === adminUsername.toLowerCase() && normalizedPassword === adminPassword) {
      onUnlock('admin', adminUsername);
    } else if (normalizedUsername.toLowerCase() === 'usuario' && normalizedPassword === userPasswordDefault) {
      onUnlock('viewer', 'Usuário Padrão');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 px-6 text-center select-none overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-100/50 blur-[100px] rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-100/50 blur-[100px] rounded-full" />
      
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
          className="absolute inset-0 bg-orange-500 rounded-full blur-3xl"
        />
        
        <div className="relative w-64 h-64 bg-white rounded-[56px] flex items-center justify-center p-10 shadow-2xl shadow-orange-500/10 group hover:shadow-orange-500/20 transition-all duration-500">
          <Logo className="w-48 h-48" />
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-50/50 to-transparent rounded-[48px] pointer-events-none" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs"
      >
        <h1 className="text-3xl font-bold text-orange-600 mb-2 tracking-tight font-display">Vilmardigital</h1>
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
                className={`w-full bg-zinc-900 border ${error ? 'border-orange-500' : 'border-zinc-800 focus:border-orange-500'} text-white pl-11 pr-4 py-2.5 rounded-2xl outline-none transition-all placeholder:text-zinc-600 font-medium`}
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
                className={`w-full bg-zinc-900 border ${error ? 'border-orange-500' : 'border-zinc-800 focus:border-orange-500'} text-white pl-11 pr-4 py-2.5 rounded-2xl outline-none transition-all placeholder:text-zinc-600 font-medium tracking-widest`}
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
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-600/20 font-display uppercase tracking-wider text-sm"
          >
            Acessar
          </motion.button>
        </form>
      </motion.div>

      <div className="absolute bottom-8 text-zinc-600 text-sm font-light">
        © 2026 Vilmardigital • Versão 2.4
      </div>
    </div>
  );
};

const getCategoryIcon = (category: Category, className: string = "w-6 h-6") => {
  switch (category) {
    case 'Entrada': return <DoorOpen className={className} />;
    case 'Perdão': return <Heart className={className} />;
    case 'Glória': return <Sun className={className} />;
    case 'Santo': return <Crown className={className} />;
    case 'Aleluia': return <Mic2 className={className} />;
    case 'Salmos': return <Music className={className} />;
    case 'Cordeiro': return <Heart className={className} />;
    case 'Ofertório': return <Gift className={className} />;
    case 'Comunhão': return <Layers className={className} />;
    case 'Final': return <Flag className={className} />;
    case 'Comum': return <Music className={className} />;
    default: return <Music className={className} />;
  }
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
  const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  const trans = (c: string) => {
    // Separate the note from the rest of the chord (m7, etc.)
    const match = c.match(/^([A-G][b#]?)(.*)/);
    if (!match) return c;
    
    let note = match[1];
    const suffix = match[2];
    
    // Normalize to sharps
    let index = notes.indexOf(note);
    if (index === -1) {
      index = flats.indexOf(note);
    }
    
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
  const [fontSize, setFontSize] = useState(14); // Default font size in px

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
    if (semitones === 0) return html;
    
    // Regex que identifica acordes, garantindo que não estejam dentro de tags HTML (<...>)
    const chordRegex = /(?<=^|[\s>])([A-G][b#]?(?:m|maj|min|dim|aug|sus|add|M)?\d?(?:[b#]\d)?(?:\/[A-G][b#]?)?)(?=[\s<]|$)/g;
    
    return html.replace(chordRegex, (match) => {
      return transposeChord(match, semitones);
    });
  };

  const isHtml = /<[a-z][\s\S]*>/i.test(song.content);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white text-gray-900 flex flex-col"
    >
      {/* Header Fixo */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <button 
            onClick={onClose}
            className="p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{song.title}</h1>
            <div className="flex items-center gap-1.5">
            <span className="text-orange-600">{getCategoryIcon(song.category, "w-3 h-3")}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{song.category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {song.youtubeUrl && (
            <button 
              onClick={() => setShowPlayer(!showPlayer)}
              className={`p-2 rounded-lg transition-all ${showPlayer ? 'bg-orange-600 text-white shadow-lg' : 'bg-orange-50 text-orange-600'}`}
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
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 overflow-auto bg-gray-50/30">
        <div className="max-w-2xl mx-auto p-6 md:p-10 pb-32">
          {isHtml ? (
            <div 
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: song.lineHeight || 1.5,
                letterSpacing: song.letterSpacing !== undefined ? `${song.letterSpacing}px` : 'normal'
              }}
              className="font-mono transition-all rich-text-song"
              dangerouslySetInnerHTML={{ __html: transposeHtml(song.content, transpose) }}
            />
          ) : (
            <div 
              style={{ fontSize: `${fontSize}px` }}
              className="whitespace-pre-wrap font-mono leading-relaxed transition-all"
            >
              {song.content.split('\n').map((line, i) => {
                const parts = line.split(/(\s+)/);
                return (
                  <div key={i} className="min-h-[1.5em] relative">
                    {parts.map((part, j) => {
                      const isChord = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|M)?\d?(?:[b#]\d)?(?:\/[A-G][b#]?)?$/.test(part.trim());
                      if (isChord) {
                        const transposed = transpose !== 0 ? transposeChord(part.trim(), transpose) : part.trim();
                        return <span key={j} className="text-orange-700 font-bold bg-orange-50/50 px-0.5 rounded scale-105 inline-block">{part.replace(part.trim(), transposed)}</span>;
                      }
                      return <span key={j} className="text-gray-800">{part}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Toolbar Subordinada */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-gray-100 p-2 rounded-2xl shadow-2xl z-30">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button 
            onClick={() => setFontSize(prev => Math.max(10, prev - 2))}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white rounded-lg transition-all"
          >
            <span className="text-xs">A-</span>
          </button>
          <button 
            onClick={() => setFontSize(prev => Math.min(30, prev + 2))}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white rounded-lg transition-all"
          >
            <span className="text-lg">A+</span>
          </button>
        </div>

        {(onPrev || onNext) && (
          <div className="flex items-center gap-1 bg-orange-600 rounded-xl p-1">
            <button 
              disabled={!onPrev}
              onClick={onPrev} 
              className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-orange-500 rounded-lg transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="w-[1px] h-6 bg-orange-400"></div>
            <button 
              disabled={!onNext}
              onClick={onNext} 
              className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-orange-500 rounded-lg transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

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
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white aspect-video relative">
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

export default function App() {
  const [userRole, setUserRole] = useState<'admin' | 'viewer' | null>(() => {
    const saved = localStorage.getItem('userRole');
    return (saved === 'admin' || saved === 'viewer') ? saved : null;
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

  const handleLogout = () => {
    setUserRole(null);
    setUserIdentifier(null);
    setUserId(null);
    setSessionId(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userIdentifier');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionId');
  };

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
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'suggestions' | 'users' | 'editor'>('songs');
  const [viewMode, setViewMode] = useState<'categories' | 'songs' | 'edit-song' | 'playlist-list' | 'edit-playlist' | 'view-playlist' | 'suggestions' | 'manage-users' | 'editor'>('categories');
  
  // Editor State
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEditorCategoryModal, setShowEditorCategoryModal] = useState(false);
  const [showEditorTitleModal, setShowEditorTitleModal] = useState(false);
  const [editorSongTitle, setEditorSongTitle] = useState('');
  const [editorLineHeight, setEditorLineHeight] = useState(1.5);
  const [editorLetterSpacing, setEditorLetterSpacing] = useState(0);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer');
  
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

  // Song selection/editing
  const [selectedLiturgicalTime, setSelectedLiturgicalTime] = useState<LiturgicalTime>('Tempo Comum');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    // Safety timeout: stop loading after 5 seconds no matter what
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

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
    }, (error) => {
      console.error("Users listener error:", error);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubSongs();
      unsubPlaylists();
      unsubUsers();
      clearTimeout(timeout);
    };
  }, []);

  const handleSaveFromEditor = async (category: Category) => {
    const content = editorRef.current?.innerHTML || '';
    if (!editorSongTitle || !content || saving) {
      if (!editorSongTitle) alert("Por favor, informe o título.");
      if (!content) alert("O conteúdo da cifra está vazio.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: editorSongTitle,
        content: content,
        category: category,
        ownerId: userIdentifier,
        youtubeUrl: '',
        lineHeight: editorLineHeight,
        letterSpacing: editorLetterSpacing,
        updatedAt: serverTimestamp()
      };

      if (editingSongId) {
        await updateDoc(doc(db, 'songs', editingSongId), data);
      } else {
        await addDoc(collection(db, 'songs'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setShowEditorCategoryModal(false);
      setEditorSongTitle('');
      setEditingSongId(null);
      if (editorRef.current) editorRef.current.innerHTML = '';
      setActiveTab('songs');
      setViewMode('categories');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'songs');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLowercaseLyrics = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    
    // 1. Protect Tags
    const tags: string[] = [];
    let protectedHtml = html.replace(/<[^>]+>/g, (match) => {
      tags.push(match);
      return `___TAG_${tags.length - 1}___`;
    });
    
    // 2. Protect Chords
    // We use the same chord regex as the transposer
    const chordRegex = /(^|[\s>])([A-G][b#]?(?:m|maj|min|dim|aug|sus|add|M)?\d?(?:[b#]\d)?(?:\/[A-G][b#]?)?)(?=[\s<]|$)/g;
    
    const chords: string[] = [];
    protectedHtml = protectedHtml.replace(chordRegex, (match, p1, p2) => {
      chords.push(p2);
      return `${p1}___CHORD_${chords.length - 1}___`;
    });
    
    // 3. Lowercase everything else
    protectedHtml = protectedHtml.toLowerCase();
    
    // 4. Restore Chords
    protectedHtml = protectedHtml.replace(/___chord_(\d+)___/g, (match, p1) => {
      return chords[parseInt(p1)];
    });
    
    // 5. Restore Tags
    protectedHtml = protectedHtml.replace(/___tag_(\d+)___/g, (match, p1) => {
      return tags[parseInt(p1)];
    });
    
    // Update content preserving undo stack if possible
    editorRef.current.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertHTML', false, protectedHtml);
  };

  const handleCreateOrUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong || saving) return;

    setSaving(true);
    try {
      const data = {
        title: editingSong.title || '',
        content: editingSong.content || '',
        category: editingSong.category || selectedCategory || 'Comum',
        youtubeUrl: editingSong.youtubeUrl || '',
        lineHeight: editingSong.lineHeight || 1.5,
        letterSpacing: editingSong.letterSpacing || 0,
        updatedAt: serverTimestamp()
      };

      if (editingSong.id) {
        await updateDoc(doc(db, 'songs', editingSong.id), data);
      } else {
        await addDoc(collection(db, 'songs'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
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
        if (userRole !== 'admin' && editingPlaylist.ownerId !== userIdentifier) {
          alert('Apenas administradores ou o dono da playlist podem editar.');
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
    try {
      await deleteDoc(doc(db, 'songs', id));
      setDeletingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `songs/${id}`);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'playlists', id));
      setDeletingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `playlists/${id}`);
    }
  };

  const handleCreateAccessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserPassword || saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'access_users'), {
        name: newUserName,
        password: newUserPassword,
        role: newUserRole,
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
    try {
      await deleteDoc(doc(db, 'access_users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `access_users/${id}`);
    }
  };

  const handleTransposeChange = async (songId: string, transpose: number) => {
    if (viewMode === 'view-playlist' && selectedPlaylist) {
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
        onUnlock={async (role, identifier, id) => {
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
          localStorage.setItem('userRole', role);
          localStorage.setItem('userIdentifier', identifier);
          if (id) localStorage.setItem('userId', id);
          localStorage.setItem('sessionId', newSession);
          setActiveTab('songs');
          setViewMode('categories');
          setSelectedCategory(null);
          setSearchTerm('');
        }} 
      />
    );
  }

  const filteredSongs = songs
    .filter(s => !selectedCategory || s.category === selectedCategory)
    .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredPlaylists = playlists
    .filter(p => p.ownerId === userIdentifier || (!p.ownerId && userIdentifier === '4040'))
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-30 min-h-[72px]">
        {/* Left Section: Back or Logo */}
        <div className="flex-1 flex items-center">
          {viewMode !== 'categories' && viewMode !== 'playlist-list' ? (
            <button 
              onClick={() => {
                if (viewMode === 'songs') setViewMode('categories');
                else if (viewMode === 'edit-song') setViewMode('songs');
                else if (viewMode === 'edit-playlist') setViewMode('playlist-list');
                else if (viewMode === 'view-playlist') setViewMode('playlist-list');
              }}
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="shrink-0 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              <Logo className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Center Section: User Info (Centered) */}
        <div className="flex flex-col items-center justify-center gap-1.5 min-w-0 px-2 max-w-[60%]">
          <label className="relative cursor-pointer group" title="Mudar foto de perfil">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={handleProfilePicUpload}
            />
            <div className="w-14 h-14 rounded-full bg-orange-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-500 group-active:scale-95">
              {userProfilePic ? (
                <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="bg-orange-100 w-full h-full flex items-center justify-center text-orange-600 font-bold text-lg">
                  {userIdentifier?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
          </label>
          <div className="flex flex-col items-center min-w-0 w-full">
            <h1 className="font-black text-xs text-zinc-900 uppercase tracking-widest truncate w-full text-center">
              {userIdentifier || 'Vilmardigital'}
            </h1>
            <p className="text-[9px] font-bold text-orange-600 uppercase truncate w-full text-center tracking-tighter">
              {viewMode === 'categories' ? 'Menu Principal' :
               viewMode === 'playlist-list' ? 'Playlists' :
               viewMode === 'songs' ? selectedCategory : 
               viewMode === 'edit-song' ? (editingSong?.id ? 'Editar Cifra' : 'Nova Cifra') :
               viewMode === 'edit-playlist' ? (editingPlaylist?.id ? 'Editar Playlist' : 'Nova Playlist') :
               viewMode === 'view-playlist' ? selectedPlaylist?.title : 
               viewMode === 'suggestions' ? 'Sugestões' : 
               viewMode === 'manage-users' ? 'Gerenciar Usuários' : ''}
            </p>
          </div>
        </div>

        {/* Right Section: Logout */}
        <div className="flex-1 flex items-center justify-end">
          <button 
            onClick={handleLogout}
            className="p-2 -mr-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28">
        <AnimatePresence mode="wait">
          {/* CATEGORIES TAB: Categories View */}
          {activeTab === 'songs' && viewMode === 'categories' && (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 grid grid-cols-2 gap-3"
            >
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setViewMode('songs');
                  }}
                  className="bg-white p-3.5 rounded-xl border border-orange-500 flex flex-col items-start gap-2.5 hover:border-orange-500 hover:shadow-sm transition-all group active:scale-95"
                >
                  <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    {getCategoryIcon(category, "w-4 h-4")}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900 text-sm leading-tight">{category}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      {songs.filter(s => s.category === category).length} CIFRAS
                    </span>
                  </div>
                </button>
              ))}
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
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>

              {filteredSongs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredSongs.map(song => (
                    <div 
                      key={song.id}
                      className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between group active:bg-gray-50"
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
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            {song.category}
                          </p>
                        </div>
                      </div>
                      {userRole === 'admin' && (
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
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Título</label>
                  <input 
                    type="text" 
                    required
                    value={editingSong?.title || ''}
                    onChange={e => setEditingSong({...editingSong, title: e.target.value})}
                    placeholder="Título da música"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Categoria</label>
                  <select 
                    value={editingSong?.category || selectedCategory || 'Comum'}
                    onChange={e => setEditingSong({...editingSong, category: e.target.value as Category})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Link do YouTube (Opcional)</label>
                  <div className="relative">
                    <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="url" 
                      value={editingSong?.youtubeUrl || ''}
                      onChange={e => setEditingSong({...editingSong, youtubeUrl: e.target.value})}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Conteúdo (Cifras e Letras)</label>
                  {(/<[a-z][\s\S]*>/i.test(editingSong?.content || '') || editingSong?.lineHeight || editingSong?.letterSpacing) ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        <button type="button" onClick={() => document.execCommand('bold')} className="p-2 hover:bg-orange-100 rounded transition-colors"><Bold className="w-4 h-4 text-orange-600"/></button>
                        <button type="button" onClick={() => document.execCommand('justifyLeft')} className="p-2 hover:bg-orange-100 rounded transition-colors"><AlignLeft className="w-4 h-4 text-orange-600"/></button>
                        <button type="button" onClick={() => document.execCommand('justifyCenter')} className="p-2 hover:bg-orange-100 rounded transition-colors"><AlignCenter className="w-4 h-4 text-orange-600"/></button>
                        <button type="button" onClick={() => document.execCommand('justifyRight')} className="p-2 hover:bg-orange-100 rounded transition-colors"><AlignRight className="w-4 h-4 text-orange-600"/></button>
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-2 ml-1">
                          <button type="button" onClick={() => setEditingSong({...editingSong, lineHeight: Math.max(1, (editingSong.lineHeight || 1.5) - 0.1)})} className="p-1 px-2 text-[10px] font-bold bg-white rounded border">LH-</button>
                          <button type="button" onClick={() => setEditingSong({...editingSong, lineHeight: Math.min(3, (editingSong.lineHeight || 1.5) + 0.1)})} className="p-1 px-2 text-[10px] font-bold bg-white rounded border">LH+</button>
                        </div>
                      </div>
                      <div 
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onInput={(e) => setEditingSong({...editingSong, content: e.currentTarget.innerHTML})}
                        className="w-full min-h-[300px] bg-white border border-orange-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm overflow-y-auto"
                        style={{ 
                          lineHeight: editingSong?.lineHeight || 1.5, 
                          letterSpacing: editingSong?.letterSpacing !== undefined ? `${editingSong.letterSpacing}px` : 'normal'
                        }}
                        dangerouslySetInnerHTML={{ __html: editingSong?.content || '' }}
                      />
                      <p className="text-[10px] text-orange-600 font-bold uppercase italic">Modo Editor Rico Ativado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea 
                        required
                        rows={12}
                        value={editingSong?.content || ''}
                        onChange={e => setEditingSong({...editingSong, content: e.target.value})}
                        placeholder="Cole aqui a cifra..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm leading-relaxed"
                      />
                      <button 
                        type="button"
                        onClick={() => setEditingSong({...editingSong, content: `<div>${(editingSong?.content || '').replace(/\n/g, '<br>')}</div>`, lineHeight: 1.5, letterSpacing: 0})}
                        className="text-xs font-bold text-orange-600 hover:underline uppercase tracking-widest"
                      >
                        + Ativar Formatação Rica (Gritos, Alinhamento, Cores)
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 pb-10">
                  <button 
                    type="button"
                    onClick={() => setViewMode('songs')}
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
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {filteredPlaylists.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredPlaylists.map(playlist => (
                    <div 
                      key={playlist.id}
                      className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center justify-between active:bg-gray-50"
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
                        {userRole === 'admin' && (
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
                        {(userRole === 'admin' || userRole === 'viewer') && (
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
              <div className="bg-orange-600 rounded-3xl p-6 mb-8 text-white shadow-xl shadow-orange-100">
                <h2 className="text-2xl font-bold mb-2">{selectedPlaylist.title}</h2>
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
                    className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 active:bg-gray-50 text-left hover:border-orange-200 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 overflow-hidden flex items-center gap-3">
                      <div className="text-orange-600">
                        {getCategoryIcon(song.category, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{song.title}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{song.category}</p>
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
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="text-left flex items-center gap-3 overflow-hidden">
                            <div className={isSelected ? 'text-yellow-700' : 'text-orange-600'}>
                              {getCategoryIcon(song.category, "w-4 h-4")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{song.title}</p>
                              <p className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-yellow-800' : 'text-gray-400'}`}>
                                {song.category}
                              </p>
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

          {/* SUGGESTIONS TAB */}
          {activeTab === 'suggestions' && (
            <motion.div 
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-4"
            >
              <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-orange-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-600 p-2 rounded-xl">
                    <Search className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Busca Litúrgica</h2>
                    <p className="text-sm text-gray-500">Consulte a liturgia diária e sugestões no Google</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tempo Litúrgico</label>
                      <div className="flex flex-wrap gap-2">
                        {LITURGICAL_TIMES.map(time => (
                          <button
                            key={time}
                            onClick={() => setSelectedLiturgicalTime(time)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                              selectedLiturgicalTime === time 
                              ? 'bg-orange-600 text-white shadow-md' 
                              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Data da Missa (Opcional)</label>
                      <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full bg-orange-50 border border-orange-200 text-orange-900 px-10 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <a
                      href={getGoogleSearchUrl(selectedLiturgicalTime, selectedDate)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 bg-white border-2 border-orange-200 text-orange-600 py-4 rounded-2xl font-bold hover:bg-orange-50 transition-all text-sm shadow-sm"
                    >
                      <Search className="w-5 h-5" />
                      Pesquisar Liturgia no Google
                    </a>
                    <a
                      href={getMusicSuggestionsSearchUrl(selectedLiturgicalTime, selectedDate)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 active:scale-95 transition-all text-sm"
                    >
                      <Music className="w-5 h-5" />
                      Buscar Músicas de Sugestão
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs px-2">Links Rápidos e Fontes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {LITURGY_SOURCES.map(source => (
                    <a
                      key={source.name}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 text-center hover:shadow-md transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{source.name}</span>
                    </a>
                  ))}
                </div>
                
                <div className="bg-orange-50/50 rounded-2xl p-6 mt-4 border border-orange-200/50">
                  <h4 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Dica de Uso
                  </h4>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Utilize os botões acima para encontrar a Liturgia Diária oficial e repertórios sugeridos por comunidades católicas. Você pode copiar o título da música encontrada e buscar diretamente na aba de <strong>Músicas</strong> do aplicativo para ver se já possui a cifra salva.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 flex flex-col gap-4"
            >
              <h2 className="text-xl font-bold text-gray-900">Editor de Cifras</h2>
              
              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 p-3 bg-white rounded-3xl border border-orange-100 shadow-sm">
                <div className="flex gap-1 border-r border-gray-100 pr-2">
                  <button onClick={() => document.execCommand('bold')} className="p-2.5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Negrito"><Bold className="w-4 h-4"/></button>
                  <button onClick={handleLowercaseLyrics} className="p-2.5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Letras em Minúsculo"><CaseLower className="w-4 h-4"/></button>
                </div>
                
                <div className="flex gap-1 border-r border-gray-100 pr-2">
                  <button onClick={() => document.execCommand('justifyLeft')} className="p-2.5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Alinhar Esquerda"><AlignLeft className="w-4 h-4"/></button>
                  <button onClick={() => document.execCommand('justifyCenter')} className="p-2.5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Centralizar"><AlignCenter className="w-4 h-4"/></button>
                  <button onClick={() => document.execCommand('justifyRight')} className="p-2.5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Alinhar Direita"><AlignRight className="w-4 h-4"/></button>
                </div>

                <div className="flex items-center gap-2 border-r border-gray-100 pr-2">
                  <div className="relative w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                    <Type className="w-4 h-4 text-orange-600" />
                    <input 
                      type="color" 
                      onChange={(e) => document.execCommand('foreColor', false, e.target.value)} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      title="Cor do Texto"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 border-r border-gray-100 pr-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      <span className="text-[9px] font-bold text-gray-400">{editorLineHeight.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditorLineHeight(prev => Math.max(0.8, prev - 0.1))} className="w-8 h-8 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center text-[10px] font-bold">-</button>
                      <button onClick={() => setEditorLineHeight(prev => Math.min(4, prev + 0.1))} className="w-8 h-8 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center text-[10px] font-bold">+</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 border-r border-gray-100 pr-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                      <span className="text-[9px] font-bold text-gray-400">{editorLetterSpacing}px</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditorLetterSpacing(prev => Math.max(-5, prev - 1))} className="w-8 h-8 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center text-[10px] font-bold">-</button>
                      <button onClick={() => setEditorLetterSpacing(prev => Math.min(20, prev + 1))} className="w-8 h-8 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center text-[10px] font-bold">+</button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button 
                    onClick={() => { 
                      // Try to use the standard paste behavior or alert user to use Ctrl+V/Cmd+V for better formatting support
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        navigator.clipboard.read().then(items => {
                          for (const item of items) {
                            if (item.types.includes('text/html')) {
                              item.getType('text/html').then(blob => {
                                blob.text().then(html => {
                                  const range = selection.getRangeAt(0);
                                  range.deleteContents();
                                  const div = document.createElement('div');
                                  div.innerHTML = html;
                                  range.insertNode(div);
                                });
                              });
                              return;
                            }
                          }
                          // Fallback to text
                          navigator.clipboard.readText().then(text => {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            range.insertNode(document.createTextNode(text));
                          });
                        }).catch(() => {
                          alert("Pressione Ctrl+V (ou Cmd+V) para colar com formatação.");
                        });
                      }
                    }} 
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
                  >
                    <Clipboard className="w-3.5 h-3.5"/>
                    Colar
                  </button>
                  <button 
                    onClick={() => {
                      const selection = window.getSelection()?.toString();
                      if (selection) {
                        navigator.clipboard.writeText(selection);
                        alert("Copiado!");
                      }
                    }} 
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5"/>
                    Copiar
                  </button>
                </div>
              </div>
              
              <div 
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="w-full h-96 bg-white border border-gray-200 rounded-3xl p-6 font-mono text-sm overflow-y-auto focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none shadow-inner"
                style={{ lineHeight: editorLineHeight, letterSpacing: `${editorLetterSpacing}px` }}
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const content = editorRef.current?.innerHTML || '';
                    if (!content.trim() || content === '<br>') {
                      alert("Escreva ou cole a cifra primeiro.");
                      return;
                    }
                    // Transfer variables to the standard Add Song screen
                    setEditingSong({
                      title: editorSongTitle,
                      content: content,
                      category: 'Comum',
                      youtubeUrl: '',
                      lineHeight: editorLineHeight,
                      letterSpacing: editorLetterSpacing
                    });
                    setActiveTab('songs');
                    setViewMode('edit-song');
                  }}
                  className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all"
                >
                  Adicionar às Categorias
                </button>
              </div>
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
                    <h2 className="font-bold text-gray-900 text-lg">Gerenciar Acessos</h2>
                    <p className="text-sm text-gray-500">Crie novos usuários e senhas</p>
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
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nível de Acesso</label>
                    <div className="flex gap-2">
                       <button
                        type="button"
                        onClick={() => setNewUserRole('viewer')}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                          newUserRole === 'viewer' 
                            ? 'bg-orange-600 text-white shadow-md' 
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
                            ? 'bg-orange-600 text-white shadow-md' 
                            : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        Administrador
                      </button>
                    </div>
                  </div>
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
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Usuários Cadastrados ({accessUsers.length})</h3>
                 {accessUsers.map(user => (
                   <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role === 'admin' ? <Crown className="w-5 h-5" /> : <Mic2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{user.name}</h4>
                          <p className="text-xs text-gray-400">Senha: <span className="font-mono">{user.password}</span></p>
                        </div>
                     </div>
                     <button
                      onClick={() => handleRemoveAccessUser(user.id)}
                      className="p-2 text-gray-300 hover:text-orange-600 transition-colors"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 ))}
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

      {activeTab === 'playlists' && viewMode === 'playlist-list' && (userRole === 'admin' || userRole === 'viewer') && (
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
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'songs' ? 'text-white' : 'text-orange-200'}`}
        >
          <Music className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cifras</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('playlists');
            setViewMode('playlist-list');
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'playlists' ? 'text-white' : 'text-orange-200'}`}
        >
          <ListMusic className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Playlists</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('suggestions');
            setViewMode('suggestions');
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'suggestions' ? 'text-white' : 'text-orange-200'}`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sugestões</span>
        </button>
        {userRole === 'admin' && (
          <button 
            onClick={() => {
              setActiveTab('editor');
              setViewMode('editor');
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'editor' ? 'text-white' : 'text-orange-200'}`}
          >
            <Edit2 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Editor</span>
          </button>
        )}
        {userRole === 'admin' && (
          <button 
            onClick={() => {
              setActiveTab('users');
              setViewMode('manage-users');
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'users' ? 'text-white' : 'text-orange-200'}`}
          >
            <Lock className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Acessos</span>
          </button>
        )}
      </nav>

      {/* Title Input Modal for Editor */}
      <AnimatePresence>
        {showEditorTitleModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 text-left">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEditorTitleModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display uppercase tracking-tight">Título da Música</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Como se chama esta cifra?</p>
              
              <input 
                type="text"
                autoFocus
                value={editorSongTitle}
                onChange={(e) => setEditorSongTitle(e.target.value)}
                className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-all font-bold text-gray-700 mb-6"
                placeholder="Digite o título..."
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEditorTitleModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (!editorSongTitle.trim()) {
                      alert("Por favor, digite um título.");
                      return;
                    }
                    setShowEditorTitleModal(false);
                    setShowEditorCategoryModal(true);
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-orange-600 shadow-lg shadow-orange-200 active:scale-95 transition-all"
                >
                  Próximo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Selection Modal for Editor */}
      <AnimatePresence>
        {showEditorCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-left">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !saving && setShowEditorCategoryModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display uppercase tracking-tight">Escolha a Categoria</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Em qual categoria deseja salvar "{editorSongTitle}"?</p>
              
              <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar p-1">
                {CATEGORIES.map(category => (
                  <button 
                    key={category}
                    onClick={() => handleSaveFromEditor(category)}
                    disabled={saving}
                    className="flex flex-col items-center gap-3 p-4 rounded-3xl border border-orange-100 hover:border-orange-500 hover:bg-orange-50 hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      {getCategoryIcon(category, "w-6 h-6")}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-700">{category}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowEditorCategoryModal(false)}
                className="w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
      </AnimatePresence>
    </div>
  );
}

