import React, { useState } from 'react';
import { 
  Tv, 
  RefreshCw, 
  Info 
} from 'lucide-react';

export default function TvPlayer() {
  const famelackUrl = 'https://famelack.com/tv/br/eNtixsVkVoQMqL';
  const [iframeKey, setIframeKey] = useState(0);

  const reloadIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="mx-auto px-2 sm:px-4 py-4 pb-24 max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Tv className="w-7 h-7 text-orange-600 animate-pulse" />
            Canal Web (TV)
          </h2>
          <p className="text-gray-500 text-xs mt-1 font-medium">
            Assista à transmissão oficial integrada em tela cheia.
          </p>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col overflow-hidden w-full relative">
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-orange-50/50 rounded-2xl p-3 border border-orange-100">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-[11px] font-bold text-gray-700 tracking-tight leading-normal">
                  Transmissão oficial Famelack TV. Se houver travamentos, utilize o botão "Recarregar".
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={reloadIframe}
                  className="p-1.5 bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Recarregar Transmissão"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Processo de ampliação vertical da tela para visualização maximizada */}
            <div className="relative w-full h-[88vh] min-h-[650px] md:min-h-[920px] bg-zinc-950 rounded-2xl overflow-hidden shadow-inner border border-zinc-900">
              <iframe
                key={iframeKey}
                src={famelackUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
