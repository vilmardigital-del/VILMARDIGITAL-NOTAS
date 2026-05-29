import React, { useState, useEffect, useRef } from 'react';
import goldMonstrance from './assets/images/gold_monstrance_1779848807599.png';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Radio, 
  Calendar, 
  Volume2, 
  Save, 
  Disc,
  Clock,
  Music,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocalRecording {
  id: string;
  name: string;
  blob: Blob;
  duration: number; // in seconds
  createdAt: number;
}

// Simple IndexedDB wrapper for lightweight offline storage of binary Blobs
const DB_NAME = 'VilmardigitalAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecordingToDB(recording: LocalRecording): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(recording);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecordingsFromDB(): Promise<LocalRecording[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteRecordingFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export default function VoiceRecorder() {
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingName, setRecordingName] = useState('');
  
  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ [id: string]: number }>({});
  const [playbackDurations, setPlaybackDurations] = useState<{ [id: string]: number }>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  
  // Custom audio elements for playing back each item
  const audioElementsRef = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Load recordings on initialization
  useEffect(() => {
    getAllRecordingsFromDB().then((data) => {
      // Sort newest first
      const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
      setRecordings(sorted);
    }).catch(err => {
      console.error("Erro ao carregar gravações do banco local:", err);
    });

    return () => {
      // Clean up playing audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format record duration
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Select best MIME type
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const durationSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        
        const timestamp = Date.now();
        const defaultName = `Gravação - ${new Date(timestamp).toLocaleDateString('pt-BR')} ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const finalName = recordingName.trim() || defaultName;

        const newRec: LocalRecording = {
          id: timestamp.toString(),
          name: finalName,
          blob: audioBlob,
          duration: durationSec,
          createdAt: timestamp
        };

        try {
          await saveRecordingToDB(newRec);
          setRecordings(prev => [newRec, ...prev]);
        } catch (dbErr) {
          console.error("Erro ao salvar no IndexedDB:", dbErr);
        }

        // Reset state
        setRecordingName('');
        setRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Erro ao obter acesso ao microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Play/Pause local recording
  const handlePlayPause = (rec: LocalRecording) => {
    // If playing another recording, pause it first
    if (playingId && playingId !== rec.id) {
      const currentAudio = audioElementsRef.current[playingId];
      if (currentAudio) {
        currentAudio.pause();
      }
      setPlayingId(null);
    }

    let audio = audioElementsRef.current[rec.id];
    if (!audio) {
      const audioUrl = URL.createObjectURL(rec.blob);
      audio = new Audio(audioUrl);
      audioElementsRef.current[rec.id] = audio;

      audio.ontimeupdate = () => {
        setPlaybackProgress(prev => ({
          ...prev,
          [rec.id]: audio.currentTime
        }));
      };

      audio.onloadedmetadata = () => {
        setPlaybackDurations(prev => ({
          ...prev,
          [rec.id]: audio.duration
        }));
      };

      audio.onended = () => {
        setPlayingId(null);
        setPlaybackProgress(prev => ({
          ...prev,
          [rec.id]: 0
        }));
      };
    }

    if (playingId === rec.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.play().catch(e => {
        console.error("Erro ao tocar áudio:", e);
      });
      setPlayingId(rec.id);
    }
  };

  // Handle seek range slider change
  const handleSeekChange = (recId: string, value: number) => {
    const audio = audioElementsRef.current[recId];
    if (audio) {
      audio.currentTime = value;
      setPlaybackProgress(prev => ({
        ...prev,
        [recId]: value
      }));
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);



  // Delete recording
  const handleDelete = async (id: string) => {
    // Pause if playing
    const audio = audioElementsRef.current[id];
    if (audio) {
      audio.pause();
      delete audioElementsRef.current[id];
    }
    
    if (playingId === id) {
      setPlayingId(null);
    }

    try {
      await deleteRecordingFromDB(id);
      setRecordings(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Erro ao deletar gravação:", err);
    }
    setDeleteConfirmId(null);
  };

  // Download recording file
  const handleDownload = (rec: LocalRecording) => {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    // Guess file extension based on mimeType inside blob, default to webm or wav
    const ext = rec.blob.type.includes('ogg') ? 'ogg' : rec.blob.type.includes('mp4') ? 'm4a' : 'webm';
    a.download = `${rec.name.replace(/[^a-zA-Z0-9\s-_]/g, '')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-32 relative overflow-hidden">
      
      {/* Background Watermark/Ostensório */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none w-[340px] h-[340px] md:w-[450px] md:h-[450px] flex items-center justify-center select-none z-0">
        <img 
          src={goldMonstrance} 
          alt="Ostensório" 
          className="w-full h-full object-contain select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Header */}
      <div className="mb-6 relative z-10">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Mic className="w-7 h-7 text-orange-600" />
          Grave seus ensaios
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Painel do gravador (compacted layout) */}
        <div className="lg:col-span-12 xl:col-span-4 bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[240px]">
          
          <div className="flex-1 flex flex-col items-center justify-center py-3">
            <div className="relative mb-3.5">
              <AnimatePresence>
                {isRecording && (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 bg-red-600 rounded-full"
                  />
                )}
              </AnimatePresence>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 relative z-10 ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30' 
                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/30'
                }`}
                title={isRecording ? "Parar Gravação" : "Iniciar Gravação"}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 fill-white text-white" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </button>
            </div>

            {/* Timer visual */}
            <div className="text-center">
              <div className={`text-2xl font-black tracking-wider transition-colors duration-300 ${isRecording ? 'text-red-600' : 'text-gray-900'}`}>
                {formatTime(recordingTime)}
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                {isRecording ? (
                  <>
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                    Gravando...
                  </>
                ) : (
                  'Pronto'
                )}
              </p>
            </div>
          </div>

          {/* Campo opcional de Nome antes de gravar ou no processo */}
          <div className="border-t border-gray-100 pt-3.5 mt-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Nome da Gravação (Opcional)
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Ex: Ensaio do Salmo..."
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                disabled={isRecording}
                className="w-full bg-orange-50/50 border border-orange-100 text-xs rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 font-medium placeholder-gray-400 disabled:opacity-50"
              />
              <Save className="absolute right-3 top-2.5 w-3.5 h-3.5 text-orange-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Lista de gravações */}
        <div className="lg:col-span-12 xl:col-span-8 flex flex-col">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex-1 flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Disc className="w-5 h-5 text-orange-500" />
              Minhas Gravações ({recordings.length})
            </h3>

            {recordings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                  <Music className="w-6 h-6 text-orange-400" />
                </div>
                <h4 className="text-sm font-bold text-gray-700">Nenhuma gravação por enquanto</h4>
                <p className="text-xs text-gray-500 max-w-xs mt-1">
                  Pressione o botão vermelho à esquerda para gravar sua primeira faixa. Ela aparecerá aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {recordings.map((rec) => {
                  const isPlaying = playingId === rec.id;
                  const currentProgress = playbackProgress[rec.id] || 0;
                  const currentTotal = playbackDurations[rec.id] || rec.duration;
                  const dateString = new Date(rec.createdAt).toLocaleDateString('pt-BR');

                  return (
                    <div 
                      key={rec.id}
                      className={`border rounded-2xl p-4 transition-all duration-200 ${
                        isPlaying ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-gray-50/30 border-gray-100 hover:border-orange-100'
                      }`}
                    >
                      {/* Cima: Título e Ações */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 truncate" title={rec.name}>
                            {rec.name}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              {dateString}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(rec.duration)}
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ações rápidas */}
                        <div className="flex gap-1.5 shrink-0">

                          <button
                            onClick={() => handleDownload(rec)}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-orange-600 hover:border-orange-100 transition-colors cursor-pointer"
                            title="Baixar Gravação"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(rec.id)}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-100 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Baixo: Player Controls */}
                      <div className="flex items-center gap-3 mt-3 bg-white border border-gray-100/80 rounded-xl p-2">
                        <button
                          onClick={() => handlePlayPause(rec)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            isPlaying 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 min-w-[28px] text-right font-mono">
                            {formatTime(currentProgress)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={currentTotal}
                            step={0.1}
                            value={currentProgress}
                            onChange={(e) => handleSeekChange(rec.id, parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-gray-400 min-w-[28px] text-left font-mono">
                            {formatTime(currentTotal)}
                          </span>
                        </div>
                        <Volume2 className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmação de Exclusão (In-App Modal para evitar bloqueios de iframe) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Excluir Gravação?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Tem certeza que deseja apagar esta gravação? Esta ação removerá permanentemente o arquivo do seu dispositivo.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-600/10"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
