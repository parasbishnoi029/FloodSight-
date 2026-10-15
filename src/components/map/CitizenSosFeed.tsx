import React, { useState } from 'react';
import { Radio, AlertTriangle, ShieldCheck, Send, Plus, X, MessageSquare, MapPin } from 'lucide-react';
import { CitizenSosReport } from '../../services/citizenSosService';

interface CitizenSosFeedProps {
  reports: CitizenSosReport[];
  onAddReport: (report: CitizenSosReport) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenSosFeed: React.FC<CitizenSosFeedProps> = ({ reports, onAddReport, isOpen, onClose }) => {
  const [newMsg, setNewMsg] = useState('');
  const [newAuthor, setNewAuthor] = useState('@field_commander');
  const [newUrgency, setNewUrgency] = useState<'critical' | 'high' | 'moderate'>('high');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const report: CitizenSosReport = {
      id: `sos-${Date.now()}`,
      source: 'Telegram',
      author: newAuthor,
      timestamp: 'Just now',
      latOffset: (Math.random() - 0.5) * 0.02,
      lngOffset: (Math.random() - 0.5) * 0.02,
      message: newMsg,
      urgency: newUrgency,
      verifiedBySatellite: true,
      confidenceMatch: Math.floor(75 + Math.random() * 24)
    };
    onAddReport(report);
    setNewMsg('');
    setIsAdding(false);
  };

  return (
    <div className="absolute right-3 top-20 z-50 w-80 sm:w-96 bg-[#0a0f1d]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-7rem)] text-left animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Citizen SOS & Ground-Truth Feed</h3>
            <p className="text-[10px] text-slate-400">Sensor fusion loop (Telegram / WhatsApp)</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`p-3 rounded-xl border transition-all ${
              report.urgency === 'critical'
                ? 'bg-red-950/30 border-red-500/40 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                : report.urgency === 'high'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-100'
                : 'bg-slate-900/80 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                  {report.source}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{report.author}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{report.timestamp}</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed mb-2 font-sans">{report.message}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <div className="flex items-center gap-1 text-cyan-400 font-mono font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Satellite Match: {report.confidenceMatch}%</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded font-mono uppercase text-[9px] font-bold ${
                report.urgency === 'critical' ? 'bg-red-900/80 text-red-200' : 'bg-amber-900/80 text-amber-200'
              }`}>
                {report.urgency}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Report Toggle / Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 rounded-b-2xl">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Citizen SOS Report</span>
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-400 font-bold">New Ground-Truth Report</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Enter ground report (e.g. Water rising past embankment...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 h-16 resize-none font-sans"
              required
            />
            <div className="flex items-center gap-2">
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-500 flex-1"
              >
                <option value="critical">Critical Urgency</option>
                <option value="high">High Urgency</option>
                <option value="moderate">Moderate Urgency</option>
              </select>
              <button
                type="submit"
                className="py-1 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
