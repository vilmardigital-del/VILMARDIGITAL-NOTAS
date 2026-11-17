import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3.5 py-2 text-xs'
        }`}
        title="Instalar aplicativo para usar off-line"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-1.5 text-xs'
          }`}
          title="Instalar no iPhone / iPad para usar off-line"
        >
          <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-orange-100 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold text-orange-950 uppercase tracking-tight">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed space-y-2">
                Para usar o <strong>catoliCifras</strong> como aplicativo e acessar suas cifras off-line:
              </p>
              <ol className="mt-3 space-y-2 text-xs text-gray-700 font-medium list-decimal list-inside">
                <li>Toque no botão <strong>Compartilhar</strong> na barra do Safari.</li>
                <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-orange-600 hover:bg-orange-700 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[99990] flex items-center gap-2 rounded-full bg-amber-600/95 px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-lg border border-amber-400/60 backdrop-blur-sm pointer-events-none whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Off-line — Usando dados salvos no aparelho</span>
    </div>
  );
};
