import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X, Radar, Satellite, Layers, FileText, Globe } from 'lucide-react';

interface HotkeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeyModal: React.FC<HotkeyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'D', label: 'Command Hub', desc: 'Real-time overview & model status', icon: <Radar className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: 'M', label: 'Tactical Maps', desc: 'Interactive flood maps & spatial viewer', icon: <Layers className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: 'A', label: 'Satellite Analysis', desc: 'Upload GeoTIFF & neural segmentation', icon: <Satellite className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: 'R', label: 'Incident Reports', desc: 'Executive briefings & audit records', icon: <FileText className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: 'H', label: 'Overview', desc: 'Global 3D Earth observation model', icon: <Globe className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: '?', label: 'Shortcuts', desc: 'Toggle keyboard navigation cheat sheet', icon: <Keyboard className="w-3.5 h-3.5 text-[#39B8C8]" /> },
    { key: 'ESC', label: 'Dismiss', desc: 'Close dialogs and overlays', icon: <X className="w-3.5 h-3.5 text-[#AAB8C8]" /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#080D14]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="relative w-full max-w-lg bg-[rgba(22,34,49,0.88)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.2)] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[rgba(148,170,195,0.14)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[8px] bg-[rgba(16,25,37,0.8)] border border-[rgba(148,170,195,0.18)] flex items-center justify-center text-[#39B8C8]">
                <Keyboard className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F3F5F7]">
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-[#AAB8C8]">
                  Command navigation for rapid operational response
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-[8px] text-[#AAB8C8] hover:text-[#F3F5F7] hover:bg-[rgba(16,25,37,0.6)] transition-colors duration-[160ms] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcut List */}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between p-2.5 rounded-[10px] bg-[rgba(16,25,37,0.72)] border border-[rgba(148,170,195,0.14)] hover:border-[rgba(57,184,200,0.25)] hover:bg-[rgba(22,34,49,0.8)] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)]"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-[6px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.16)]">
                      {sc.icon}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#F3F5F7]">
                        {sc.label}
                      </div>
                      <div className="text-[11px] text-[#AAB8C8] leading-tight">
                        {sc.desc}
                      </div>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 text-xs font-mono font-medium text-[#F3F5F7] bg-[rgba(22,34,49,0.9)] border border-[rgba(148,170,195,0.22)] rounded-[6px] select-none shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[rgba(148,170,195,0.12)] flex items-center justify-between text-xs text-[#AAB8C8]">
              <span>Single-key shortcuts active globally</span>
              <span>Press <kbd className="text-[#F3F5F7] bg-[rgba(16,25,37,0.8)] px-1.5 py-0.5 rounded-[6px] border border-[rgba(148,170,195,0.2)] font-mono text-[10px]">ESC</kbd> to close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
