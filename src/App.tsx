import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
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
  Disc,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { CATEGORIES, Category, Song, Playlist, LiturgicalTime, LITURGICAL_TIMES, AccessUser } from './types';
import { getLiturgicalSuggestions, Suggestion } from './services/suggestionsService';

// Components
const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    {/* Guitar Pick Shape SVG */}
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">
      <path 
        d="M 10 32 C 10 15 25 2 50 2 C 75 2 90 15 90 32 C 90 55 65 92 50 98 C 35 92 10 55 10 32 Z" 
        fill="#ea580c" 
      />
    </svg>
    <Music className="relative z-10 w-[45%] h-[45%] text-white -translate-y-1" />
  </div>
);

const PasswordView = ({ onUnlock, accessUsers }: { onUnlock: (role: 'admin' | 'viewer') => void, accessUsers: AccessUser[] }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '4526';
  const userPassword = import.meta.env.VITE_USER_PASSWORD || '7946';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check dynamic users first
    const foundUser = accessUsers.find(u => u.password === password);
    if (foundUser) {
      onUnlock(foundUser.role);
      return;
    }

    // Fallback to Env passwords
    if (password === adminPassword) {
      onUnlock('admin');
    } else if (password === userPassword) {
      onUnlock('viewer');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-6 text-center select-none overflow-hidden">
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
        
        <div className="relative w-32 h-32 bg-white rounded-[32px] flex items-center justify-center p-5 shadow-2xl shadow-orange-500/20 group hover:shadow-orange-500/30 transition-all duration-500">
          <Logo className="w-20 h-20" />
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-50/50 to-transparent rounded-[32px] pointer-events-none" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs"
      >
        <h1 className="text-3xl font-bold text-[#dc6400] mb-2 tracking-tight">Vilmardigital</h1>
        <p className="text-zinc-400 mb-8 font-light">Partituras e Cifras Digitais</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <input 
              type="password"
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-zinc-900 border ${error ? 'border-red-500 bg-red-500/10' : 'border-zinc-800 focus:border-orange-500'} text-white px-4 py-4 rounded-2xl outline-none transition-all placeholder:text-zinc-600 font-medium text-center tracking-widest`}
              autoFocus
            />
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-6 left-0 right-0 text-red-500 text-xs font-medium"
              >
                Senha incorreta. Tente novamente.
              </motion.div>
            )}
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-orange-600/30 mt-2"
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
    case 'Final': return <Flag className={className} />;
    default: return <Music className={className} />;
  }
};

const getYoutubeEmbedUrl = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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

  useEffect(() => {
    setTranspose(initialTranspose);
  }, [initialTranspose, song.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleTranspose = (delta: number) => {
    const newVal = transpose + delta;
    setTranspose(newVal);
    onTransposeChange?.(newVal);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white text-gray-900 p-6 overflow-auto"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-2 border-b border-gray-100 z-10">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            {song.youtubeUrl && (
              <button 
                onClick={() => setShowPlayer(!showPlayer)}
                className={`p-3 rounded-full transition-colors shrink-0 ${showPlayer ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                title="Alternar Player de Vídeo"
              >
                <Youtube className="w-6 h-6" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-orange-600">
                  {getCategoryIcon(song.category, "w-4 h-4")}
                </div>
                <p className="text-sm text-gray-500 uppercase tracking-widest">{song.category}</p>
              </div>
              <h1 className="text-xl font-bold leading-tight truncate">{song.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-full p-1 mr-2">
              <button 
                onClick={() => handleTranspose(-1)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                title="Diminuir Tom"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold w-8 text-center text-orange-600">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button 
                onClick={() => handleTranspose(1)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                title="Aumentar Tom"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {onPrev && (
              <button onClick={onPrev} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {onNext && (
              <button onClick={onNext} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200">
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Floating Player */}
        <AnimatePresence>
          {showPlayer && song.youtubeUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed bottom-24 left-4 right-4 md:right-auto md:left-8 md:w-80 z-40"
            >
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white aspect-video relative">
                <button 
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/80 z-10"
                >
                  <X className="w-4 h-4" />
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
          )}
        </AnimatePresence>

        <div className="whitespace-pre-wrap font-mono text-sm leading-tight pb-20">
          {song.content.split('\n').map((line, i) => {
            // Regex para detectar acordes comuns (A-G, sustenidos, bemóis, menores, sétimas, baixos alterados, etc)
            const parts = line.split(/(\s+)/);
            return (
              <div key={i} className="min-h-[1.25rem]">
                {parts.map((part, j) => {
                  const isChord = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|M)?\d?(?:[b#]\d)?(?:\/[A-G][b#]?)?$/.test(part.trim());
                  if (isChord) {
                    const transposed = transpose !== 0 ? transposeChord(part.trim(), transpose) : part.trim();
                    return <span key={j} className="text-orange-500 font-bold">{part.replace(part.trim(), transposed)}</span>;
                  }
                  return <span key={j}>{part}</span>;
                })}
              </div>
            );
          })}
        </div>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'suggestions' | 'users'>('songs');
  const [viewMode, setViewMode] = useState<'categories' | 'songs' | 'edit-song' | 'playlist-list' | 'edit-playlist' | 'view-playlist' | 'suggestions' | 'manage-users'>('categories');
  
  // User management state
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

  const [searchTerm, setSearchTerm] = useState('');

  // AI Suggestions state
  const [selectedLiturgicalTime, setSelectedLiturgicalTime] = useState<LiturgicalTime>('Tempo Comum');
  const [selectedDate, setSelectedDate] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const handleFetchAiSuggestions = async () => {
    setIsSearchingSuggestions(true);
    try {
      const results = await getLiturgicalSuggestions(selectedLiturgicalTime, selectedDate);
      setAiSuggestions(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearchingSuggestions(false);
    }
  };

  // Reset suggestions state when leaving the tab
  useEffect(() => {
    if (activeTab !== 'suggestions') {
      setAiSuggestions([]);
      setSelectedDate('');
    }
  }, [activeTab]);

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
        updatedAt: serverTimestamp()
      };

      if (editingPlaylist.id) {
        if (userRole !== 'admin') {
          alert('Apenas administradores podem editar playlists existentes.');
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-600"></div>
    </div>
  );

  if (!userRole) {
    return (
      <PasswordView 
        accessUsers={accessUsers}
        onUnlock={(role) => {
          setUserRole(role);
          localStorage.setItem('userRole', role);
        }} 
      />
    );
  }

  const filteredSongs = songs
    .filter(s => !selectedCategory || s.category === selectedCategory)
    .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredPlaylists = playlists.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Active songs for currently viewed playlist
  const playlistSongs = selectedPlaylist 
    ? selectedPlaylist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {viewMode !== 'categories' && viewMode !== 'playlist-list' ? (
            <button 
              onClick={() => {
                if (viewMode === 'songs') setViewMode('categories');
                else if (viewMode === 'edit-song') setViewMode('songs');
                else if (viewMode === 'edit-playlist') setViewMode('playlist-list');
                else if (viewMode === 'view-playlist') setViewMode('playlist-list');
              }}
              className="p-1 -ml-1 text-gray-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="shrink-0 bg-white rounded-lg p-0.5 shadow-sm border border-gray-100">
              <Logo className="w-8 h-8" />
            </div>
          )
        }
          <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <span className={viewMode === 'categories' ? "inline" : "hidden sm:inline"}>Vilmardigital</span>
            {viewMode === 'playlist-list' ? 'Playlists' :
             viewMode === 'songs' ? selectedCategory : 
             viewMode === 'edit-song' ? (editingSong?.id ? 'Editar Cifra' : 'Nova Cifra') :
             viewMode === 'edit-playlist' ? (editingPlaylist?.id ? 'Editar Playlist' : 'Nova Playlist') :
             viewMode === 'view-playlist' ? selectedPlaylist?.title : 
             viewMode === 'suggestions' ? 'Sugestões para Missa' : 
             viewMode === 'manage-users' ? 'Gerenciar Usuários' : ''}
          </h1>
        </div>
        <button 
          onClick={() => {
            setUserRole(null);
            localStorage.removeItem('userRole');
          }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Lock className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-auto pb-32">
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
                  className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-start gap-3 hover:border-orange-300 hover:shadow-md transition-all group active:scale-95"
                >
                  <div className="bg-orange-50 text-orange-600 p-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    {getCategoryIcon(category)}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900">{category}</span>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
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
                        <div className="shrink-0 text-orange-600 bg-orange-50 p-2 rounded-lg">
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
                                className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-lg shadow-sm"
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
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors z-10 cursor-pointer"
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
                  <textarea 
                    required
                    rows={12}
                    value={editingSong?.content || ''}
                    onChange={e => setEditingSong({...editingSong, content: e.target.value})}
                    placeholder="Cole aqui a cifra..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm leading-relaxed"
                  />
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
                                  className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-lg shadow-sm"
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
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors z-10 cursor-pointer"
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
                    className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 active:bg-gray-50 text-left"
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
              className="p-4 flex flex-col gap-6"
            >
              <form onSubmit={handleCreateOrUpdatePlaylist} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Título da Playlist</label>
                  <input 
                    type="text" 
                    required
                    value={editingPlaylist?.title || ''}
                    onChange={e => setEditingPlaylist({...editingPlaylist, title: e.target.value})}
                    placeholder="Missa de Domingo, etc."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Data</label>
                  <input 
                    type="date"
                    value={editingPlaylist?.date || ''}
                    onChange={e => setEditingPlaylist({...editingPlaylist, date: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                
                <div className="mt-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Músicas Selecionadas ({editingPlaylist?.songIds?.length || 0})</label>
                  <div className="flex flex-col gap-3 max-h-96 overflow-auto bg-gray-100 p-3 rounded-2xl">
                    {songs.map(song => {
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
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="text-left flex items-center gap-3 overflow-hidden">
                            <div className={isSelected ? 'text-orange-100' : 'text-orange-600'}>
                              {getCategoryIcon(song.category, "w-4 h-4")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{song.title}</p>
                              <p className={`text-xs uppercase tracking-wider ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                                {song.category}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 pb-10">
                  <button 
                    type="button"
                    onClick={() => setViewMode('playlist-list')}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-orange-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50"
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
              <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-orange-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-500 p-2 rounded-xl">
                    <Sparkles className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">IA Sugestões</h2>
                    <p className="text-sm text-gray-500">Busca inteligente de repertório na internet</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tempo Litúrgico</label>
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
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data da Missa (Opcional)</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full bg-orange-50 border border-orange-100 text-orange-900 px-10 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleFetchAiSuggestions}
                    disabled={isSearchingSuggestions}
                    className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center text-center gap-2"
                  >
                    {isSearchingSuggestions ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Buscando Sugestões...</span>
                        </div>
                        <span className="text-[10px] font-normal opacity-80 animate-pulse">
                          Pesquisando em sites litúrgicos (CNBB, Canção Nova, Catolicas.org...)
                        </span>
                      </div>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        {selectedDate 
                          ? `Gerar Sugestões para ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}` 
                          : `Gerar Sugestões para ${selectedLiturgicalTime}`}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiSuggestions.length > 0 ? (
                <div className="space-y-8 pb-32">
                  {/* Group suggestions by category */}
                  {CATEGORIES.map(category => {
                    const categorySuggestions = aiSuggestions.filter(s => 
                      s.category.toLowerCase().includes(category.toLowerCase()) || 
                      (category === 'Comum' && s.category.toLowerCase().includes('comunhão'))
                    );
                    
                    if (categorySuggestions.length === 0) return null;

                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <div className="text-orange-600">
                            {getCategoryIcon(category, "w-5 h-5")}
                          </div>
                          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">{category}</h3>
                        </div>
                        <div className="grid gap-3">
                          {categorySuggestions.map((suggestion, idx) => (
                            <div 
                              key={idx}
                              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-gray-900">{suggestion.title}</h4>
                                {suggestion.artist && (
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                    {suggestion.artist}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">{suggestion.description}</p>
                              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-[10px] text-orange-600 font-bold uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-md">
                                  {suggestion.liturgicalTime}
                                </span>
                                <div className="flex gap-2">
                                  {suggestion.url && (
                                    <a 
                                      href={suggestion.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 transition-colors bg-orange-50 px-2 py-1 rounded-md"
                                    >
                                      Ver cifra na web
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <button 
                                    onClick={() => {
                                      setSearchTerm(suggestion.title);
                                      setActiveTab('songs');
                                      setViewMode('songs');
                                      setSelectedCategory(category);
                                    }}
                                    className="text-[10px] text-gray-400 hover:text-orange-600 font-bold flex items-center gap-1 transition-colors"
                                  >
                                    Ver em minhas cifras
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !isSearchingSuggestions && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <Sparkles className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Selecione o tempo litúrgico<br/>e gere sugestões inteligentes</p>
                </div>
              )}
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
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-500 p-2 rounded-xl">
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
                      className="w-full bg-orange-50 border border-orange-100 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
                      className="w-full bg-orange-50 border border-orange-100 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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

              <div className="space-y-4 pb-32">
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
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
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
          className="fixed right-6 bottom-24 w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {activeTab === 'playlists' && viewMode === 'playlist-list' && (userRole === 'admin' || userRole === 'viewer') && (
        <button 
          onClick={() => {
            setEditingPlaylist({ songIds: [], transpositions: {} });
            setViewMode('edit-playlist');
          }}
          className="fixed right-6 bottom-24 w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 bg-orange-600 rounded-[32px] flex justify-around p-2 z-40 shadow-2xl shadow-orange-600/30">
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

