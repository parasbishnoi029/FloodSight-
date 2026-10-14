import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Analyze } from './pages/Analyze';
import { MapView } from './pages/MapView';
import { Reports } from './pages/Reports';
import { About } from './pages/About';
import { HotkeyModal } from './components/layout/HotkeyModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { NavigationTab, HealthStatus, FloodAnalysisResult, AnalysisSummary } from './types';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('landing');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisSummary | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState<boolean>(false);

  const toggleHotkeyModal = useCallback(() => {
    setIsHotkeyModalOpen((prev) => !prev);
  }, []);

  const closeHotkeyModal = useCallback(() => {
    setIsHotkeyModalOpen(false);
  }, []);

  // Hook up global hotkeys manager
  useKeyboardShortcuts({
    currentTab,
    onSelectTab: setCurrentTab,
    onToggleHotkeyModal: toggleHotkeyModal,
    onCloseModal: closeHotkeyModal,
  });

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
      verification_id: res.verification_id,
      file_hash_sha256: res.file_hash_sha256,
      checkpoint_hash: res.checkpoint_hash,
      timestamp: res.created_at,
      filename: res.filename,
      crs_type: res.crs_type,
      origin_lat: res.origin_lat,
      origin_lon: res.origin_lon,
      pixel_scale: res.pixel_scale,
      angular_resolution_deg: res.angular_resolution_deg,
      approx_ground_resolution_m: res.approx_ground_resolution_m,
      projected_resolution_m: res.projected_resolution_m,
      status: 'Completed',
      floodedAreaHa: res.physical_area_ha !== null ? `${res.physical_area_ha} ha` : 'Unreferenced raster',
      coverage_percent: res.coverage_percent,
      flood_pixel_count: res.flood_pixel_count,
      valid_pixel_count: res.valid_pixel_count,
      total_pixels: res.total_pixels,
      confidence_mean: res.confidence_mean,
      threshold_used: res.threshold_used,
      area_calculation_method: res.area_calculation_method,
      spatial_resolution_m: res.spatial_resolution_m,
      geospatial_validity: res.geospatial_validity,
      inference_latency_ms: res.inference_latency_ms,
      physical_area_notes: res.physical_area_notes,
      affectedRoads: 'Awaiting Road Vector Intersect',
      affectedBridges: 'Awaiting Bridge Graph',
      isolatedZones: `${res.connected_regions} water bodies`,
      priorityScore: 'Deterministic Calculation Ready',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080D14] text-[#F3F5F7] selection:bg-[#39B8C8]/25 selection:text-[#F3F5F7]">
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
        onOpenHotkeys={toggleHotkeyModal}
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

        {currentTab === 'map' && <MapView activeAnalysis={activeAnalysis} />}

        {currentTab === 'reports' && (
          <Reports
            onNavigate={setCurrentTab}
            activeAnalysis={activeAnalysis}
          />
        )}

        {currentTab === 'about' && <About />}
      </main>

      {currentTab !== 'map' && <Footer />}

      <HotkeyModal
        isOpen={isHotkeyModalOpen}
        onClose={closeHotkeyModal}
      />
    </div>
  );
}
