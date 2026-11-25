import React, {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registrar Service Worker para funcionamento off-line e PWA com atualização automática
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkUpdate = () => {
        registration.update().catch(() => {
          // ignore network errors when offline
        });
      };

      checkUpdate();
      window.setInterval(checkUpdate, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });
    },
    onOfflineReady() {
      console.info('catoliCifras pronto para funcionar off-line.');
    },
  });
}

// Prevenção imediata de pull-to-refresh e atalhos de reload no navegador
if (typeof window !== 'undefined') {
  // Bloqueio de pull-to-refresh em navegadores touch/mobile
  let touchY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const currentY = e.touches[0].clientY;
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (currentY > touchY && scrollY <= 0) {
        let el = e.target as HTMLElement | null;
        let isScrolled = false;
        while (el && el !== document.body && el !== document.documentElement) {
          if (el.scrollTop > 0) {
            isScrolled = true;
            break;
          }
          el = el.parentElement;
        }
        if (!isScrolled && e.cancelable) {
          e.preventDefault();
        }
      }
    }
  }, { passive: false });

  // Bloqueio de F5 e Ctrl+R / Cmd+R
  window.addEventListener('keydown', (e) => {
    const isF5 = e.key === 'F5' || e.code === 'F5' || e.keyCode === 116;
    const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR' || e.keyCode === 82);
    if (isF5 || isCtrlR) {
      e.preventDefault();
    }
  }, { capture: true });
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white">
          <h1 className="text-2xl font-bold text-orange-500 mb-4">Algo deu errado</h1>
          <p className="text-zinc-400 mb-6">Ocorreu um erro ao carregar o aplicativo.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-orange-600 px-6 py-2 rounded-xl font-bold"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
