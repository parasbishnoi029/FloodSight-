import React, { useState } from 'react';
import { BoatDispatchService, RescueUnit, DispatchTask } from '../../services/boatDispatchService';
import { Anchor, ShieldAlert, Navigation, CheckCircle2, Plus } from 'lucide-react';

export const BoatDispatchPanel: React.FC = () => {
  const [units, setUnits] = useState<RescueUnit[]>(BoatDispatchService.getUnits());
  const [tasks, setTasks] = useState<DispatchTask[]>(BoatDispatchService.getTasks());
  const [manifests, setManifests] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSector, setNewSector] = useState('Sector 9 - Industrial Basin');
  const [newDepth, setNewDepth] = useState('1.6');
  const [newResidents, setNewResidents] = useState('12');

  const handleOptimize = () => {
    const newAssignments = BoatDispatchService.optimizeDispatch();
    setManifests(newAssignments.map(a => a.assignment));
    setUnits([...BoatDispatchService.getUnits()]);
    setTasks([...BoatDispatchService.getTasks()]);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    BoatDispatchService.addCustomTask({
      sector: newSector,
      coordinates: [29.95, -90.07],
      waterDepthMeters: Number(newDepth),
      vulnerableResidentsCount: Number(newResidents),
      sosTimestamp: 'Just now',
      etaMinutes: 10,
      status: 'PENDING',
    });
    setTasks([...BoatDispatchService.getTasks()]);
    setShowAddModal(false);
  };

  return (
    <div className="bg-[rgba(16,25,37,0.88)] backdrop-blur-md border border-[rgba(148,170,195,0.2)] rounded-xl p-4 text-xs text-[#F3F5F7] shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[rgba(148,170,195,0.12)] pb-2.5">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-[#39B8C8]" />
          <span className="font-semibold text-sm">Deterministic Rescue Boat Dispatch Optimizer</span>
        </div>
        <button
          onClick={handleOptimize}
          className="px-3 py-1.5 bg-[#39B8C8] hover:bg-[#55CAD6] text-[#080D14] font-semibold rounded-lg transition shadow-[0_2px_8px_rgba(57,184,200,0.25)] cursor-pointer flex items-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5" /> Optimize Manifest
        </button>
      </div>

      {manifests.length > 0 && (
        <div className="bg-[rgba(57,184,200,0.1)] border border-[rgba(57,184,200,0.3)] p-3 rounded-lg space-y-1.5">
          <div className="text-[#39B8C8] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Active Sequenced Dispatch Manifest:
          </div>
          {manifests.map((m, idx) => (
            <div key={idx} className="font-mono text-[11px] text-[#F3F5F7] bg-[rgba(8,13,20,0.5)] px-2 py-1 rounded">
              {m}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Units list */}
        <div className="bg-[rgba(8,13,20,0.5)] p-3 rounded-lg border border-[rgba(148,170,195,0.1)] space-y-2">
          <div className="font-semibold text-[#AAB8C8] uppercase tracking-wider text-[10px]">Fleet Units ({units.length})</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {units.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-[rgba(22,34,49,0.6)] p-2 rounded border border-[rgba(148,170,195,0.08)]">
                <div>
                  <div className="font-medium text-white">{u.name}</div>
                  <div className="text-[10px] text-[#AAB8C8]">{u.type} · Cap: {u.capacity} pax</div>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                  u.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Tasks list */}
        <div className="bg-[rgba(8,13,20,0.5)] p-3 rounded-lg border border-[rgba(148,170,195,0.1)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[#AAB8C8] uppercase tracking-wider text-[10px]">Priority Sectors ({tasks.length})</div>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-[#39B8C8] hover:underline flex items-center gap-1 font-medium text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add SOS Sector
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-[rgba(22,34,49,0.6)] p-2 rounded border border-[rgba(148,170,195,0.08)]">
                <div>
                  <div className="font-medium text-white">{t.sector}</div>
                  <div className="text-[10px] text-red-400">⚠️ {t.vulnerableResidentsCount} residents · {t.waterDepthMeters}m depth</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-amber-400 font-bold text-xs">{t.priorityScore} pts</div>
                  <div className="text-[9px] text-[#AAB8C8]">{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#101925] border border-[rgba(148,170,195,0.3)] rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Register Ground-Truth SOS Sector
            </h3>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#AAB8C8] mb-1">Sector Name / Description</label>
                <input
                  type="text"
                  value={newSector}
                  onChange={e => setNewSector(e.target.value)}
                  className="w-full bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.2)] rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#AAB8C8] mb-1">Water Depth (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newDepth}
                    onChange={e => setNewDepth(e.target.value)}
                    className="w-full bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.2)] rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#AAB8C8] mb-1">Vulnerable Residents</label>
                  <input
                    type="number"
                    value={newResidents}
                    onChange={e => setNewResidents(e.target.value)}
                    className="w-full bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.2)] rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[rgba(148,170,195,0.1)] text-[#AAB8C8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#39B8C8] text-[#080D14] font-semibold hover:bg-[#55CAD6]"
                >
                  Add & Prioritize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
