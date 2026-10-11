import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Analyze } from './pages/Analyze';
import { MapView } from './pages/MapView';
import { Reports } from './pages/Reports';
import { About } from './pages/About';
import { NavigationTab, HealthStatus, FloodAnalysisResult, AnalysisSummary } from './types';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('landing');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisSummary | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    // Initial health check
    checkBackendHealth().then((status) => {
      setHealth(status);
    });

    // Periodic health check every 30s
    const interval = setInterval(() => {
      checkBackendHealth().then((status) => {
        setHealth(status);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleAnalyzeSuccess = (res: FloodAnalysisResult, file: File) => {
    setActiveAnalysis({
      id: res.analysis_id,
      timestamp: res.created_at,
      filename: res.filename,
      status: 'Completed',
      floodedAreaHa: res.physical_area_ha !== null ? `${res.physical_area_ha} ha` : 'Unreferenced raster',
      affectedRoads: 'Awaiting Road Vector Intersect',
      affectedBridges: 'Awaiting Bridge Graph',
      isolatedZones: `${res.connected_regions} water bodies`,
      priorityScore: 'Deterministic Calculation Ready',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        health={health}
      />

      <main className="flex-1 flex flex-col">
        {currentTab === 'landing' && (
          <Landing onNavigate={setCurrentTab} />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigate={setCurrentTab}
            health={health}
          />
        )}

        {currentTab === 'analyze' && (
          <Analyze
            onAnalyzeSuccess={handleAnalyzeSuccess}
            onNavigate={setCurrentTab}
            health={health}
          />
        )}

        {currentTab === 'map' && <MapView />}

        {currentTab === 'reports' && (
          <Reports
            onNavigate={setCurrentTab}
            activeAnalysis={activeAnalysis}
          />
        )}

        {currentTab === 'about' && <About />}
      </main>

      {currentTab !== 'map' && <Footer />}
    </div>
  );
}
