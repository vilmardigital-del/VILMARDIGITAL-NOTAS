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
  AlertTriangle,
  Share2,
  Wand2,
  Sparkles
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

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = raw PCM (16-bit)
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + result.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, result.length * 2, true);
  
  // write samples
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([bufferArr], { type: 'audio/wav' });
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
  const [shareItem, setShareItem] = useState<LocalRecording | null>(null);

  // Function to share using Native Web Share API or falling back to WhatsApp Web sharing helper
  const handleShareWhatsApp = async (rec: LocalRecording) => {
    try {
      const ext = rec.blob.type.includes('ogg') ? 'ogg' : rec.blob.type.includes('mp4') ? 'm4a' : 'webm';
      const cleanFileName = `${rec.name.replace(/[^a-zA-Z0-9\s-_]/g, '')}.${ext}`;
      const file = new File([rec.blob], cleanFileName, { type: rec.blob.type });

      // Check if Web Share API with files is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: rec.name,
          text: `Escute o ensaio/música: ${rec.name}`
        });
        return;
      }
    } catch (err) {
      console.warn("Compartilhamento nativo falhou, usando modal:", err);
    }

    // Open explanatory fallback helper modal
    setShareItem(rec);
  };

  const [isProcessingVocals, setIsProcessingVocals] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleRemoveVocal = async (rec: LocalRecording) => {
    setIsProcessingVocals(true);
    setProcessingStatus('Inicializando processador de áudio...');
    try {
      const arrayBuffer = await rec.blob.arrayBuffer();
      
      setProcessingStatus('Lendo arquivo de áudio local...');
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      
      setProcessingStatus('Decodificando ondas sonoras...');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setProcessingStatus('Configurando filtros de atenuação vocal...');
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      
      if (audioBuffer.numberOfChannels === 2) {
        setProcessingStatus('Estéreo detectado. Aplicando cancelamento de fase central...');
        const splitter = offlineCtx.createChannelSplitter(2);
        const merger = offlineCtx.createChannelMerger(2);
        
        const leftGain = offlineCtx.createGain();
        leftGain.gain.setValueAtTime(1, 0);
        
        const rightGain = offlineCtx.createGain();
        rightGain.gain.setValueAtTime(-1, 0); // cancel matching center vocals
        
        const sumGain = offlineCtx.createGain();
        sumGain.gain.setValueAtTime(0.5, 0);
        
        source.connect(splitter);
        splitter.connect(leftGain, 0);
        splitter.connect(rightGain, 1);
        
        leftGain.connect(sumGain);
        rightGain.connect(sumGain);
        
        // Suppress vocal frequencies from panned signals
        const notchFilter = offlineCtx.createBiquadFilter();
        notchFilter.type = 'peaking';
        notchFilter.frequency.setValueAtTime(1000, 0);
        notchFilter.Q.setValueAtTime(0.7, 0);
        notchFilter.gain.setValueAtTime(-18, 0);
        
        sumGain.connect(notchFilter);
        notchFilter.connect(merger, 0, 0);
        notchFilter.connect(merger, 0, 1);
        
        merger.connect(offlineCtx.destination);
      } else {
        setProcessingStatus('Mono detectado. Aplicando equalização de frequências vocais...');
        const hpFilter = offlineCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(150, 0);
        
        const peakFilter1 = offlineCtx.createBiquadFilter();
        peakFilter1.type = 'peaking';
        peakFilter1.frequency.setValueAtTime(950, 0);
        peakFilter1.Q.setValueAtTime(0.9, 0);
        peakFilter1.gain.setValueAtTime(-28, 0);
        
        const peakFilter2 = offlineCtx.createBiquadFilter();
        peakFilter2.type = 'peaking';
        peakFilter2.frequency.setValueAtTime(2400, 0);
        peakFilter2.Q.setValueAtTime(1.1, 0);
        peakFilter2.gain.setValueAtTime(-20, 0);
        
        source.connect(hpFilter);
        hpFilter.connect(peakFilter1);
        peakFilter1.connect(peakFilter2);
        peakFilter2.connect(offlineCtx.destination);
      }
      
      setProcessingStatus('Filtro ativo. Sintetizando trilha instrumental (karaokê)...');
      source.start(0);
      
      const renderedBuffer = await offlineCtx.startRendering();
      
      setProcessingStatus('Formatando áudio para formato WAV...');
      const wavBlob = bufferToWav(renderedBuffer);
      
      setProcessingStatus('Salvando trilha "Sem Vocal" no seu navegador...');
      const timestamp = Date.now();
      const newRecName = `${rec.name} (Sem Vocal)`;
      
      const newRec: LocalRecording = {
        id: timestamp.toString(),
        name: newRecName,
        blob: wavBlob,
        duration: rec.duration,
        createdAt: timestamp
      };
      
      await saveRecordingToDB(newRec);
      setRecordings(prev => [newRec, ...prev]);
      
      setProcessingStatus('Concluído! Nova faixa adicionada.');
      setTimeout(() => {
        setIsProcessingVocals(false);
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar: ' + (err.message || err));
      setIsProcessingVocals(false);
    }
  };

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
                          {!rec.name.includes('(Sem Vocal)') && (
                            <button
                              onClick={() => handleRemoveVocal(rec)}
                              className="p-1.5 bg-purple-50 border border-purple-200/80 rounded-lg text-purple-600 hover:text-white hover:bg-purple-600 hover:border-purple-600 transition-all cursor-pointer flex items-center justify-center"
                              title="Remover vocal da música (Gerar Instrumental)"
                            >
                              <Wand2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleShareWhatsApp(rec)}
                            className="p-1.5 bg-green-50 border border-green-200/80 rounded-lg text-green-600 hover:text-white hover:bg-green-600 hover:border-green-600 transition-all cursor-pointer"
                            title="Compartilhar no WhatsApp"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M12.008.01a11.95 11.95 0 0 0-8.477 3.513c-2.265 2.268-3.51 5.28-3.512 8.484.001 2.097.548 4.142 1.588 5.946L.057 24l6.17-1.616c1.751.956 3.719 1.457 5.724 1.458 6.613 0 11.949-5.34 11.953-11.997a11.921 11.921 0 0 0-3.505-8.484c-2.265-2.267-5.275-3.512-8.477-3.513zm0 21.993c-1.922 0-3.812-.516-5.466-1.493l-.392-.233-4.06 1.064 1.084-3.957-.256-.407a9.923 9.923 0 0 1-1.52-5.326c0-5.467 4.448-9.915 9.92-9.915s9.92 4.448 9.92 9.915-4.448 9.915-9.92 9.915zm5.437-7.409c-.297-.15-1.758-.868-2.03-.967-.273-.1-.472-.15-.67.15-.197.3-.767.967-.94 1.165-.173.2-.347.225-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.06-.173-.3-.018-.462.13-.61.135-.133.298-.347.446-.52.15-.174.198-.298.298-.497.1-.2.05-.373-.025-.522-.075-.15-.67-1.615-.918-2.212-.24-.579-.48-.5-.67-.51c-.172-.008-.371-.01-.57-.01-.198 0-.52.075-.792.373-.272.298-1.04 1.018-1.04 2.485s1.065 2.883 1.214 3.082c.148.199 2.096 3.2 5.077 4.487.709.306 1.262.49 1.694.627.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.292.173-1.417-.074-.124-.272-.198-.57-.348z" />
                            </svg>
                          </button>
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

        {shareItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col z-50"
            >
              <div className="text-center mb-4 flex flex-col items-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-green-600 fill-current" viewBox="0 0 24 24">
                    <path d="M12.008.01a11.95 11.95 0 0 0-8.477 3.513c-2.265 2.268-3.51 5.28-3.512 8.484.001 2.097.548 4.142 1.588 5.946L.057 24l6.17-1.616c1.751.956 3.719 1.457 5.724 1.458 6.613 0 11.949-5.34 11.953-11.997a11.921 11.921 0 0 0-3.505-8.484c-2.265-2.267-5.275-3.512-8.477-3.513zm0 21.993c-1.922 0-3.812-.516-5.466-1.493l-.392-.233-4.06 1.064 1.084-3.957-.256-.407a9.923 9.923 0 0 1-1.52-5.326c0-5.467 4.448-9.915 9.92-9.915s9.92 4.448 9.92 9.915-4.448 9.915-9.92 9.915zm5.437-7.409c-.297-.15-1.758-.868-2.03-.967-.273-.1-.472-.15-.67.15-.197.3-.767.967-.94 1.165-.173.2-.347.225-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.06-.173-.3-.018-.462.13-.61.135-.133.298-.347.446-.52.15-.174.198-.298.298-.497.1-.2.05-.373-.025-.522-.075-.15-.67-1.615-.918-2.212-.24-.579-.48-.5-.67-.51c-.172-.008-.371-.01-.57-.01-.198 0-.52.075-.792.373-.272.298-1.04 1.018-1.04 2.485s1.065 2.883 1.214 3.082c.148.199 2.096 3.2 5.077 4.487.709.306 1.262.49 1.694.627.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.292.173-1.417-.074-.124-.272-.198-.57-.348z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-900">Enviar no WhatsApp</h3>
                <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">{shareItem.name}</p>
              </div>

              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-5 text-left text-sm text-gray-700 space-y-3 leading-relaxed">
                <div>
                  <p className="font-extrabold text-orange-950 flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 text-[10px] font-black flex items-center justify-center">1</span>
                    Salve o Áudio no Aparelho
                  </p>
                  <p className="text-xs pl-6 text-gray-600">Como o áudio está guardado em segurança apenas no seu navegador, você precisa salvá-lo no celular/PC primeiro.</p>
                </div>
                <div>
                  <p className="font-extrabold text-orange-950 flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 text-[10px] font-black flex items-center justify-center">2</span>
                    Anexe na Mensagem
                  </p>
                  <p className="text-xs pl-6 text-gray-600">Abra a conversa do WhatsApp, toque no ícone de clipe/anexo e selecione o arquivo baixado.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => {
                    handleDownload(shareItem);
                  }}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-600/10"
                >
                  <Download className="w-4 h-4" /> 1. Baixar Áudio para Enviar
                </button>
                
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Acabei de gravar o ensaio "${shareItem.name}" no aplicativo. Estou te enviando o arquivo de áudio!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer text-center shadow-md shadow-green-600/10"
                >
                  2. Chamar no WhatsApp
                </a>

                <button
                  onClick={() => setShareItem(null)}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-500 hover:text-gray-700 font-bold rounded-xl transition text-sm cursor-pointer mt-2"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isProcessingVocals && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center z-50"
            >
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-purple-500/35 rounded-full"
                />
                <Sparkles className="w-8 h-8 text-purple-600 animate-pulse relative z-10" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Processando Áudio</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Removendo Vocais</p>
              
              <div className="w-full bg-purple-100/65 h-1.5 rounded-full overflow-hidden mb-6 relative">
                <motion.div 
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                />
              </div>

              <p className="text-sm text-gray-600 leading-relaxed font-semibold">
                {processingStatus}
              </p>
              <p className="text-[10px] text-gray-400 mt-4 leading-relaxed max-w-xs">
                Este processo roda 100% no seu aparelho sem gastar internet ou enviar seus arquivos para fora.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
