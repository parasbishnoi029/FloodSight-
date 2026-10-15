import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 rounded-[9px] bg-[rgba(57,184,200,0.15)] hover:bg-[rgba(57,184,200,0.25)] border border-[rgba(57,184,200,0.4)] text-[#39B8C8] flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" /> Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="px-3 py-1.5 rounded-[9px] bg-[rgba(148,170,195,0.1)] hover:bg-[rgba(148,170,195,0.2)] border border-[rgba(148,170,195,0.2)] text-[#F3F5F7] flex items-center gap-1.5 text-xs font-medium cursor-pointer transition whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5" /> Install iOS PWA
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm bg-[#101925] border border-[rgba(148,170,195,0.3)] rounded-xl p-5 text-left space-y-3 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#39B8C8]" /> Install FloodSight AI on iOS
              </h3>
              <p className="text-xs text-[#AAB8C8] leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-[#39B8C8] text-[#080D14] font-semibold text-xs mt-2"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => alert('FloodSight AI is PWA-ready. You can install this app via your browser menu (Add to Home Screen / Install App).')}
      className="px-3 py-1.5 rounded-[9px] bg-[rgba(148,170,195,0.1)] hover:bg-[rgba(148,170,195,0.2)] border border-[rgba(148,170,195,0.2)] text-[#F3F5F7] flex items-center gap-1.5 text-xs font-medium cursor-pointer transition whitespace-nowrap"
    >
      <Download className="w-3.5 h-3.5" /> PWA Ready
    </button>
  );
};
