import React, { useState } from 'react';
import { FileText, Send, CheckCircle2, X, ShieldAlert, Download, Copy, Radio } from 'lucide-react';
import { SitrepReportData, generateIcs209Markdown } from '../../services/sitrepService';

interface Ics209SitrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  sitrepData: SitrepReportData;
}

export const Ics209SitrepModal: React.FC<Ics209SitrepModalProps> = ({ isOpen, onClose, sitrepData }) => {
  const [isDispatched, setIsDispatched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const reportText = generateIcs209Markdown(sitrepData);

  const handleDispatch = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsDispatched(true);
    }, 1200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ICS-209-SITREP-${sitrepData.incidentName.replace(/\s+/g, '-')}.txt`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0a0f1d] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col max-h-[90vh] text-left">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-mono text-white uppercase tracking-wider">
                ICS-209 Federal Situation Report (SITREP) Dispatcher
              </h2>
              <p className="text-xs text-slate-400">Standardized Emergency Operations Command Format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Population at Risk</span>
              <p className="text-base font-bold font-mono text-white">{sitrepData.socioImpact.totalPopulationAtRisk.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Hospitals / Assets</span>
              <p className="text-base font-bold font-mono text-amber-400">{sitrepData.socioImpact.hospitalsAtRisk} At Risk</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Model Confidence</span>
              <p className="text-base font-bold font-mono text-cyan-400">{sitrepData.confidenceScore}% Verified</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Citizen SOS Feeds</span>
              <p className="text-base font-bold font-mono text-red-400">{sitrepData.sosReports.length} Reports</p>
            </div>
          </div>

          {/* SITREP Raw Preview Box */}
          <div className="relative">
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-200/90 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72">
              {reportText}
            </pre>
          </div>

          {isDispatched && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center gap-3 text-cyan-200">
              <CheckCircle2 className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold font-mono uppercase text-white">SITREP Dispatched Successfully</h4>
                <p className="text-[11px] text-cyan-300">Secure webhook confirmed delivery to FEMA Region IV SEOC and First Responder GPS Tablets.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/60 rounded-b-3xl">
          <div className="text-[11px] font-mono text-slate-400">
            Secure Webhook Endpoint: <span className="text-cyan-400">https://fema.gov/api/v2/sitrep-dispatch</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDispatch}
              disabled={isSending || isDispatched}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isDispatched
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : isDispatched ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dispatched</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Broadcast SITREP</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
