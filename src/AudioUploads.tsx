import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Headphones, 
  Music, 
  Trash2, 
  Search, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle,
  FileAudio,
  Volume2,
  X,
  VolumeX,
  Clock,
  User,
  Disc,
  HardDrive,
  Database
} from 'lucide-react';
import { db, storage } from './lib/firebase';
import { AccessUser } from './types';

// --- IndexedDB Local Storage Helpers ---
const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SantosAudiosDB', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;
      if (!db.objectStoreNames.contains('local_recordings')) {
        db.createObjectStore('local_recordings', { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as any).result);
    };
    request.onerror = (event) => {
      reject((event.target as any).error);
    };
  });
};

const saveLocalRecording = (recording: any): Promise<void> => {
  return initIndexedDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('local_recordings', 'readwrite');
      const store = transaction.objectStore('local_recordings');
      const request = store.put(recording);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as any).error);
    });
  });
};

const getLocalRecordings = (): Promise<any[]> => {
  return initIndexedDB().then((db) => {
    return new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction('local_recordings', 'readonly');
      const store = transaction.objectStore('local_recordings');
      const request = store.getAll();
      request.onsuccess = (event) => resolve((event.target as any).result || []);
      request.onerror = (event) => reject((event.target as any).error);
    });
  });
};

const deleteLocalRecording = (id: string): Promise<void> => {
  return initIndexedDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('local_recordings', 'readwrite');
      const store = transaction.objectStore('local_recordings');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as any).error);
    });
  });
};

interface AudioUploadsProps {
  currentUserDoc: AccessUser | undefined;
  userRole: 'master' | 'admin' | 'viewer';
  userId: string;
  userIdentifier: string;
}

interface RecordingItem {
  id: string;
  name: string;
  audioUrl: string;
  createdBy: string;
  createdByRole?: string;
  createdByUsername?: string;
  createdAt: any;
  fileType?: string;
  fileSize?: string;
  duration?: number;
  isLocal?: boolean;
  blob?: Blob;
}

export default function AudioUploads({ 
  currentUserDoc, 
  userRole, 
  userId, 
  userIdentifier 
}: AudioUploadsProps) {
  // Collection state
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [dbRecordings, setDbRecordings] = useState<RecordingItem[]>([]);
  const [localRecordings, setLocalRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Local object URL references for memory hygiene
  const localUrlsRef = React.useRef<string[]>([]);

  // Function to load recordings stored offline in IndexedDB
  const loadLocalRecordings = async () => {
    try {
      const list = await getLocalRecordings();
      
      // Clean up previous URLs to prevent memory leakage
      localUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("Error revoking object URL:", e);
        }
      });
      localUrlsRef.current = [];

      const newUrls: string[] = [];
      const items: RecordingItem[] = list.map((item) => {
        const url = URL.createObjectURL(item.blob);
        newUrls.push(url);
        return {
          id: item.id,
          name: item.name || 'Áudio Sem Nome',
          audioUrl: url,
          createdBy: item.createdBy || '',
          createdByRole: item.createdByRole || 'viewer',
          createdByUsername: item.createdByUsername || 'Anônimo',
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          fileType: item.fileType || 'MP3',
          fileSize: item.fileSize || '---',
          duration: item.duration || 0,
          isLocal: true,
          blob: item.blob
        };
      });

      localUrlsRef.current = newUrls;
      setLocalRecordings(items);
    } catch (e) {
      console.error("Failed to load local recordings from IndexedDB:", e);
    }
  };

  // Upload form state
  const [customName, setCustomName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Active custom player state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Delete modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);

  // Load IndexedDB on mount and clean up on unmount
  useEffect(() => {
    loadLocalRecordings();
    
    return () => {
      // Cleanup Object URLs on unmount
      localUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  // Combine firestore and local recordings
  useEffect(() => {
    const getTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (val.seconds) return val.seconds * 1000;
      if (val.toDate && typeof val.toDate === 'function') return val.toDate().getTime();
      if (val instanceof Date) return val.getTime();
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sorted = [...dbRecordings, ...localRecordings].sort((a, b) => {
      return getTime(b.createdAt) - getTime(a.createdAt);
    });
    setRecordings(sorted);
  }, [dbRecordings, localRecordings]);

  // Listen to Firestore recordings
  useEffect(() => {
    const recordingsRef = collection(db, 'recordings');
    const q = query(recordingsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: RecordingItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || 'Áudio Sem Nome',
          audioUrl: data.audioUrl || '',
          createdBy: data.createdBy || '',
          createdByRole: data.createdByRole || 'viewer',
          createdByUsername: data.createdByUsername || 'Anônimo',
          createdAt: data.createdAt,
          fileType: data.fileType || 'MP3',
          fileSize: data.fileSize || '---',
          duration: data.duration || 0
        });
      });
      setDbRecordings(items);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching recordings:", err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  // Update playback time
  useEffect(() => {
    if (!audioElement) return;

    const onTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audioElement.duration || 0);
    };

    const onEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
    };

    audioElement.addEventListener('timeupdate', onTimeUpdate);
    audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
    audioElement.addEventListener('ended', onEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', onTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioElement.removeEventListener('ended', onEnded);
    };
  }, [audioElement]);

  // Handle playing music
  const handleTogglePlay = (recording: RecordingItem) => {
    if (playingId === recording.id) {
      if (audioElement) {
        if (audioElement.paused) {
          audioElement.play().catch(err => console.error("Play failed", err));
        } else {
          audioElement.pause();
        }
      }
    } else {
      // Pause existing
      if (audioElement) {
        audioElement.pause();
      }

      const newAudio = new Audio(recording.audioUrl);
      newAudio.crossOrigin = "anonymous";
      newAudio.play()
        .then(() => {
          setPlayingId(recording.id);
          setAudioElement(newAudio);
        })
        .catch(err => {
          console.error("Audio playback failed", err);
          setErrorStatus("Erro ao iniciar áudio. O formato pode não ser compatível com seu navegador.");
        });
    }
  };

  const getAudioDurationDisplay = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorStatus(null);
    setSuccessStatus(null);
    
    // Size check (max 50MB to prevent storage abuse)
    if (file.size > 50 * 1024 * 1024) {
      setErrorStatus("O áudio excede o limite recomendado de 50MB.");
      return;
    }

    setSelectedFile(file);

    // Default title to filename (without extension) if not set
    if (!customName) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setCustomName(nameWithoutExt);
    }
  };

  // Convert extension to clean UpperCase format label
  const getFormatLabel = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'AUDIO';
    if (ext === 'OGG' || ext === 'OPUS') return 'WhatsApp';
    return ext;
  };

  const getFriendlySize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const convertFileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload handler which saves the file locally in IndexedDB as requested by the user
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorStatus("Por favor, selecione um arquivo de áudio.");
      return;
    }

    if (!customName.trim()) {
      setErrorStatus("Por favor, digite um nome identificador para o áudio.");
      return;
    }

    setIsUploading(true);
    setErrorStatus(null);
    setSuccessStatus(null);
    setUploadProgress(10);

    try {
      // 1. Get the dynamic, accurate duration of the selected file
      let audioDur = 0;
      try {
        audioDur = await new Promise<number>((resolve) => {
          const u = URL.createObjectURL(selectedFile);
          const tempAudio = new Audio(u);
          tempAudio.addEventListener('loadedmetadata', () => {
            resolve(tempAudio.duration || 0);
          });
          // safety timeout
          setTimeout(() => resolve(0), 1500);
        });
      } catch {
        audioDur = 0;
      }

      setUploadProgress(50);

      // 2. Create the offline recording package with original uncompressed file
      const newRecord = {
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        name: customName.trim(),
        blob: selectedFile, // Save the complete original uncompressed and unedited Blob in browser storage!
        createdBy: userId,
        createdByRole: userRole,
        createdByUsername: userIdentifier,
        fileType: getFormatLabel(selectedFile.name),
        fileSize: getFriendlySize(selectedFile.size),
        duration: audioDur,
        createdAt: Date.now()
      };

      setUploadProgress(80);

      // 3. Save into local IndexedDB
      await saveLocalRecording(newRecord);

      setUploadProgress(100);

      // Refresh recordings list to make the new audio visible at once
      await loadLocalRecordings();

      setSuccessStatus("Áudio completo carregado e salvo com sucesso localmente (sem cortes ou editores)!");
      setSelectedFile(null);
      setCustomName('');
      setUploadProgress(null);
      setIsUploading(false);

    } catch (err: any) {
      console.error("Error saving recording:", err);
      setErrorStatus(err?.message || "Ocorreu um erro ao processar e salvar o áudio.");
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Delete handler
  const handleDelete = async (recording: RecordingItem) => {
    try {
      // Stop audio if it's currently playing
      if (playingId === recording.id && audioElement) {
        audioElement.pause();
        setPlayingId(null);
      }

      // If the recording is local (stored in IndexedDB)
      if (recording.isLocal) {
        await deleteLocalRecording(recording.id);
        await loadLocalRecordings();
        setSuccessStatus("Áudio local removido com sucesso!");
        setConfirmDeleteId(null);
        return;
      }

      // If the recording is remote (stored in Firestore)
      await deleteDoc(doc(db, 'recordings', recording.id));

      // Attempt to delete associated Storage object if present and not a Base64 local fallback template
      const docSnap = dbRecordings.find(r => r.id === recording.id);
      const storagePath = (docSnap as any)?.storagePath;
      
      if (storagePath && storage && !recording.audioUrl.startsWith('data:')) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef).catch(storageErr => {
          console.warn("Storage item delete skipped or not found:", storageErr);
        });
      }

      setSuccessStatus("Áudio removido com sucesso!");
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error("Error deleting recording:", err);
      setErrorStatus("Erro ao deletar o áudio.");
      setConfirmDeleteId(null);
    }
  };

  // Filter recordings
  const filteredRecordings = recordings.filter(rec => {
    const q = searchQuery.toLowerCase();
    return (
      rec.name.toLowerCase().includes(q) ||
      (rec.createdByUsername || '').toLowerCase().includes(q) ||
      (rec.fileType || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      {/* Title & Info Banner */}
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center md:justify-start gap-2.5">
          <span className="bg-orange-600 text-white p-2 rounded-2xl inline-flex shadow-sm shadow-orange-300">
            <Volume2 className="w-6 h-6" />
          </span>
          Áudios Gravados
        </h1>
        <p className="text-gray-500 text-sm mt-1.5 md:ml-12">
          Compartilhe e gerencie áudios gravados no celular, iPhone (M4A), Android ou compartilhados no WhatsApp (.opus, .ogg).
        </p>
      </div>

      {/* Alert Status Banner */}
      <AnimatePresence>
        {errorStatus && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Aviso</p>
              <p className="text-xs text-red-600 mt-0.5">{errorStatus}</p>
            </div>
            <button onClick={() => setErrorStatus(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successStatus && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3 shadow-sm"
          >
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Sucesso</p>
              <p className="text-xs text-emerald-600 mt-0.5">{successStatus}</p>
            </div>
            <button onClick={() => setSuccessStatus(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Upload Panel */}
        <div className="md:col-span-5">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex flex-col gap-4 sticky top-4">
            <h2 className="font-bold text-gray-800 text-base tracking-tight flex items-center gap-2 border-b border-orange-50 pb-2.5">
              <Upload className="w-4 text-orange-600" />
              Enviar Novo Áudio
            </h2>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              
              {/* Drag & Drop File Zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('audio-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragActive 
                    ? 'border-orange-500 bg-orange-50' 
                    : selectedFile 
                      ? 'border-emerald-300 bg-emerald-50/30' 
                      : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/20'
                }`}
              >
                <input 
                  id="audio-input"
                  type="file"
                  accept="audio/*, .mp3, .m4a, .mp4, .3gp, .amr, .aac, .ogg, .opus"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Music className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="text-sm font-bold text-gray-800 break-all px-2 max-w-full truncate">
                      {selectedFile.name}
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        {getFormatLabel(selectedFile.name)}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {getFriendlySize(selectedFile.size)}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 underline mt-1 font-medium hover:text-orange-600 transition-colors">
                      Trocar arquivo
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-gray-700 text-xs">
                      Clique para selecionar ou arraste o áudio aqui
                    </div>
                    <p className="text-[10px] text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                      Suporta WhatsApp (.opus, .ogg), iPhone (.m4a, .mp4), Android, MP3, AAC, etc.
                    </p>
                  </>
                )}
              </div>

              {/* Title Field */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Nome / Título do Áudio
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Canto de Entrada - Alternativo"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  disabled={isUploading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 select-all"
                />
              </div>

              {/* Uploading progress bar */}
              {isUploading && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-700">
                    <span className="flex items-center gap-1.5">
                      <Disc className="w-4 h-4 animate-spin text-orange-600" />
                      Armazenando no dispositivo...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className={`w-full py-3 px-4 font-black tracking-wide text-xs uppercase rounded-xl shadow-md flex items-center justify-center gap-2 transition-all ${
                  isUploading || !selectedFile 
                    ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' 
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Processando...' : 'Salvar Áudio'}
              </button>

            </form>
          </div>
        </div>

        {/* Right Side: Search and List recordings */}
        <div className="md:col-span-7 flex flex-col gap-4">
          
          {/* Search bar */}
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-orange-100 flex items-center pl-3">
            <Search className="w-4 h-4 text-orange-400 shrink-0" />
            <input 
              type="text"
              placeholder="Buscar áudio por nome, formato ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none bg-transparent placeholder-gray-400 text-sm py-2 px-2.5 text-gray-800 focus:outline-none focus:ring-0 select-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 px-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 mr-1"
              >
                Limpar
              </button>
            )}
          </div>

          {/* List state (Loading) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Disc className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Buscando áudios na nuvem...</span>
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-orange-200 flex flex-col items-center justify-center gap-3">
              <div className="bg-orange-50 p-3.5 rounded-full text-orange-500">
                <Headphones className="w-8 h-8" />
              </div>
              <p className="font-bold text-gray-800 text-sm">Nenhum áudio encontrado</p>
              <p className="text-xs text-gray-400 max-w-[280px]">
                {searchQuery 
                  ? "Experimente mudar os termos de busca ou limpar a barra de pesquisa." 
                  : "Por que não faz o upload de um áudio gravado ou do WhatsApp para começar?"}
              </p>
            </div>
          ) : (
            
            /* Audio card list grid */
            <div className="flex flex-col gap-3">
              {filteredRecordings.map((recording) => {
                const isPlaying = playingId === recording.id;
                const canDelete = userRole === 'admin' || userRole === 'master' || recording.createdBy === userId;

                return (
                  <div 
                    key={recording.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition-all flex flex-col gap-3 ${
                      isPlaying 
                        ? 'border-orange-400 ring-1 ring-orange-400/50' 
                        : 'border-orange-100 hover:border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Audio Icon & Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <button 
                          onClick={() => handleTogglePlay(recording)}
                          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isPlaying 
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200' 
                              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-white stroke-[2.5]" />
                          ) : (
                            <Play className="w-5 h-5 fill-orange-600 stroke-[2.5] ml-0.5" />
                          )}
                        </button>
                        
                        <div className="min-w-0 text-left">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug truncate" title={recording.name}>
                            {recording.name}
                          </h3>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap mt-1">
                            <span className="flex items-center gap-1 font-semibold text-gray-600">
                              <User className="w-3 h-3 shrink-0" />
                              {recording.createdByUsername} 
                              <span className="text-gray-300 font-normal">({recording.createdByRole})</span>
                            </span>
                            <span>•</span>
                            <span className="bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded uppercase">
                              {recording.fileType}
                            </span>
                            <span>•</span>
                            <span>{recording.fileSize}</span>
                            <span>•</span>
                            {recording.isLocal ? (
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase flex items-center gap-1" title="Este áudio está totalmente armazenado e processado de forma local no seu aparelho sem alterações de qualidade.">
                                <HardDrive className="w-2.5 h-2.5" /> Local / Sem cortes
                              </span>
                            ) : (
                              <span className="bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase flex items-center gap-1" title="Este áudio está armazenado na nuvem.">
                                <Database className="w-2.5 h-2.5" /> Nuvem
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Delete Area */}
                      {canDelete && (
                        <div className="shrink-0">
                          {confirmDeleteId === recording.id ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleDelete(recording)}
                                className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-red-600 active:scale-95 transition-all"
                              >
                                Sim, excluir
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md hover:bg-gray-200"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(recording.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir gravação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Integrated Custom Media Progress Bar */}
                    {isPlaying && (
                      <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/20 p-2.5 rounded-xl border border-orange-100/50 flex flex-col gap-1">
                        <div className="w-full bg-orange-100 h-1.5 rounded-full overflow-hidden relative cursor-pointer"
                          onClick={(e) => {
                            if (!audioElement) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickPos = (e.clientX - rect.left) / rect.width;
                            audioElement.currentTime = clickPos * duration;
                          }}
                        >
                          <div 
                            className="bg-orange-500 h-full rounded-full transition-all duration-100"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-orange-700/80 mt-0.5">
                          <span className="font-semibold">{getAudioDurationDisplay(currentTime)}</span>
                          <span className="font-bold shrink-0">{getAudioDurationDisplay(duration)}</span>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
