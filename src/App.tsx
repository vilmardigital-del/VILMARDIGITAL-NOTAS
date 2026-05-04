import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {auth, db, logout, signInWithGoogle} from './lib/firebase';
import { CATEGORIES, Category, Song, Playlist } from './types';
import { signInAnonymously } from 'firebase/auth';

const getCategoryIcon = (category: Category, className: string = "w-6 h-6") => {
  switch (category) {
    case 'Entrada': return <DoorOpen className={className} />;
    case 'Perdão': return <Heart className={className} />;
    case 'Glória': return <Sun className={className} />;
    case 'Santo': return <Crown className={className} />;
    case 'Aleluia': return <Mic2 className={className} />;
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

const FullScreenSong = ({ song, onClose, onPrev, onNext }: { 
  song: Song, 
  onClose: () => void,
  onPrev?: () => void,
  onNext?: () => void
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [transpose, setTranspose] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

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
                <div className="text-blue-600">
                  {getCategoryIcon(song.category, "w-4 h-4")}
                </div>
                <p className="text-sm text-gray-500 uppercase tracking-widest">{song.category}</p>
              </div>
              <h1 className="text-2xl font-bold leading-tight truncate">{song.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-full p-1 mr-2">
              <button 
                onClick={() => setTranspose(prev => prev - 1)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                title="Diminuir Tom"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold w-8 text-center text-blue-600">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button 
                onClick={() => setTranspose(prev => prev + 1)}
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'suggestions'>('songs');
  const [viewMode, setViewMode] = useState<'categories' | 'songs' | 'edit-song' | 'playlist-list' | 'edit-playlist' | 'view-playlist' | 'suggestions'>('categories');
  
  // Song selection/editing
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  
  // Playlist selection/editing
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Partial<Playlist> | null>(null);
  const [currentPlaylistSongIndex, setCurrentPlaylistSongIndex] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch(err => console.error("Anonymous auth failed:", err));
      } else {
        setUser(u);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    // Songs Listener - Removed ownerId restriction to allow public viewing
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

    // Playlists Listener - Removed ownerId restriction to allow public viewing
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

    return () => {
      unsubSongs();
      unsubPlaylists();
    };
  }, [user]);

  const handleCreateOrUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingSong) return;

    try {
      const data = {
        title: editingSong.title,
        content: editingSong.content,
        category: editingSong.category || selectedCategory || 'Comum',
        youtubeUrl: editingSong.youtubeUrl || '',
        ownerId: user.uid,
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
    }
  };

  const handleCreateOrUpdatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingPlaylist) return;

    try {
      const data = {
        title: editingPlaylist.title || 'Nova Playlist',
        date: editingPlaylist.date || '',
        songIds: editingPlaylist.songIds || [],
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingPlaylist.id) {
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  const filteredSongs = songs
    .filter(s => !selectedCategory || s.category === selectedCategory)
    .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredPlaylists = playlists.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Active songs for currently viewed playlist
  const playlistSongs = selectedPlaylist 
    ? selectedPlaylist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-20">
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
            <div className="relative flex items-center justify-center">
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 p-1.5 rounded-full shadow-lg relative cursor-pointer group flex items-center justify-center">
                <Disc className="text-white w-6 h-6 animate-[spin_5s_linear_infinite]" />
                <div className="absolute w-1.5 h-1.5 bg-white rounded-full border border-blue-400"></div>
              </div>
            </div>
          )}
          <h1 className="font-bold text-lg text-gray-900">
            {viewMode === 'categories' ? 'Vilmardigital-Notas' : 
             viewMode === 'playlist-list' ? 'Playlists' :
             viewMode === 'songs' ? selectedCategory : 
             viewMode === 'edit-song' ? (editingSong?.id ? 'Editar Cifra' : 'Nova Cifra') :
             viewMode === 'edit-playlist' ? (editingPlaylist?.id ? 'Editar Playlist' : 'Nova Playlist') :
             viewMode === 'view-playlist' ? selectedPlaylist?.title : 
             viewMode === 'suggestions' ? 'Sugestões para Missa' : ''}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* CATEGORIES TAB: Categories View */}
          {activeTab === 'songs' && viewMode === 'categories' && (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 grid grid-cols-2 gap-4"
            >
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setViewMode('songs');
                  }}
                  className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col items-start gap-4 hover:border-blue-300 hover:shadow-md transition-all group active:scale-95"
                >
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
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
                        <div className="shrink-0 text-blue-600 bg-blue-50 p-2 rounded-lg">
                          {getCategoryIcon(song.category, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{song.title}</h3>
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            {song.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingSong(song);
                            setViewMode('edit-song');
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600"
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
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Categoria</label>
                  <select 
                    value={editingSong?.category || selectedCategory || 'Comum'}
                    onChange={e => setEditingSong({...editingSong, category: e.target.value as Category})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
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
                      className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
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
                    className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                  >
                    Salvar
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
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none"
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlaylist(playlist);
                            setViewMode('edit-playlist');
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
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
              <div className="bg-blue-600 rounded-3xl p-6 mb-8 text-white shadow-xl shadow-blue-100">
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
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 overflow-hidden flex items-center gap-3">
                      <div className="text-blue-600">
                        {getCategoryIcon(song.category, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{song.title}</h3>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{song.category}</p>
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
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Data</label>
                  <input 
                    type="date"
                    value={editingPlaylist?.date || ''}
                    onChange={e => setEditingPlaylist({...editingPlaylist, date: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
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
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="text-left flex items-center gap-3 overflow-hidden">
                            <div className={isSelected ? 'text-blue-100' : 'text-blue-600'}>
                              {getCategoryIcon(song.category, "w-4 h-4")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{song.title}</p>
                              <p className={`text-xs uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
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
                    className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200"
                  >
                    Salvar Playlist
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
              className="h-full flex flex-col"
            >
              <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-lg">
                    <Sparkles className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">Músicas para Missa</h2>
                    <p className="text-xs text-gray-500">Sugestões de repertório litúrgico</p>
                  </div>
                </div>
                <a 
                  href="https://musicasparamissa.com.br/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 flex items-center gap-2"
                >
                  Abrir Original
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              
              <div className="flex-1 min-h-[400px]">
                <iframe 
                  src="https://musicasparamissa.com.br/" 
                  className="w-full h-full border-none"
                  title="Sugestões para Missa"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Buttons */}
      {viewMode === 'songs' && !editingSong && (
        <button 
          onClick={() => {
            setEditingSong({});
            setViewMode('edit-song');
          }}
          className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {activeTab === 'playlists' && viewMode === 'playlist-list' && (
        <button 
          onClick={() => {
            setEditingPlaylist({ songIds: [] });
            setViewMode('edit-playlist');
          }}
          className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-300 active:scale-90 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-6 z-40">
        <button 
          onClick={() => {
            setActiveTab('songs');
            setViewMode('categories');
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'songs' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Music className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-widest">Cifras</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('playlists');
            setViewMode('playlist-list');
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'playlists' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <ListMusic className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-widest">Playlists</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('suggestions');
            setViewMode('suggestions');
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${activeTab === 'suggestions' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-widest">Sugestões</span>
        </button>
      </nav>

      {/* Full Screen Song Viewer */}
      <AnimatePresence>
        {viewingSong && (
          <FullScreenSong 
            song={viewingSong} 
            onClose={() => setViewingSong(null)} 
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

