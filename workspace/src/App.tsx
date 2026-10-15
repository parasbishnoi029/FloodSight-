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
import { DemoScenarioModal } from './components/common/DemoScenarioModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { NavigationTab, HealthStatus, FloodAnalysisResult, AnalysisSummary } from './types';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisSummary | null>(() => {
    try {
      const saved = sessionStorage.getItem('floodsight_active_analysis');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      const validTabs: NavigationTab[] = ['landing', 'dashboard', 'analyze', 'map', 'reports', 'about'];
      if (validTabs.includes(hash as NavigationTab)) {
        return hash as NavigationTab;
      }
    } catch {}
    return 'landing';
  });

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // Sync activeAnalysis with sessionStorage
  useEffect(() => {
    if (activeAnalysis) {
      try {
        sessionStorage.setItem('floodsight_active_analysis', JSON.stringify(activeAnalysis));
      } catch (e) {
        console.warn('Failed to persist activeAnalysis to sessionStorage', e);
      }
    } else {
      sessionStorage.removeItem('floodsight_active_analysis');
    }
  }, [activeAnalysis]);

  // Sync currentTab with URL hash
  useEffect(() => {
    if (currentTab) {
      window.location.hash = currentTab;
    }
  }, [currentTab]);

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

  const handleAnalyzeSuccess = (res: FloodAnalysisResult, file?: File) => {
    const summary: AnalysisSummary = {
      id: res.analysis_id,
      analysis_id: res.analysis_id,
      verification_id: res.verification_id,
      file_hash_sha256: res.file_hash_sha256,
      checkpoint_hash: res.checkpoint_hash,
      timestamp: res.created_at,
      created_at: res.created_at,
      filename: res.filename,
      crs_type: res.crs_type,
      crs_name: res.crs_name,
      epsg_code: res.epsg_code,
      origin_lat: res.origin_lat,
      origin_lon: res.origin_lon,
      pixel_scale: res.pixel_scale,
      angular_resolution_deg: res.angular_resolution_deg,
      approx_ground_resolution_m: res.approx_ground_resolution_m,
      projected_resolution_m: res.projected_resolution_m,
      geographic_bounds: res.geographic_bounds,
      corner_coordinates_latlng: res.corner_coordinates_latlng,
      status: res.status || 'Completed',
      flood_detected: res.flood_detected,
      floodedAreaHa: res.physical_area_ha !== null && res.physical_area_ha !== undefined ? `${res.physical_area_ha} ha` : 'Unreferenced raster',
      physical_area_ha: res.physical_area_ha,
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
      mask_png_data_url: res.mask_png_data_url,
      overlay_data_url: res.overlay_data_url,
      confidence_heatmap_data_url: res.confidence_heatmap_data_url,
      raster_preview_data_url: res.raster_preview_data_url,
      geojson: res.geojson,
      spatial_zones: res.spatial_zones,
      connected_regions: res.connected_regions,
      affectedRoads: 'Awaiting Road Vector Intersect',
      affectedBridges: 'Awaiting Bridge Graph',
      isolatedZones: `${res.connected_regions ?? 0} water bodies`,
      priorityScore: 'Deterministic Calculation Ready',
    };
    setActiveAnalysis(summary);
  };

  const handleSelectDemoScenario = (scenarioTitle: string) => {
    // Load pre-configured Mekong or Louisiana demo analysis summary
    const demoSummary: AnalysisSummary = {
      id: 'demo_sen1floods11_' + Date.now(),
      analysis_id: 'demo_sen1floods11_sec4',
      verification_id: 'ver_verified_sen1floods11_ok',
      file_hash_sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      checkpoint_hash: 'unet_resnet34_sen1floods11_v2_f81b',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      filename: `${scenarioTitle.replace(/\s+/g, '_').toLowerCase()}_s1_sar.tif`,
      crs_type: 'Projected',
      crs_name: 'WGS 84 / UTM Zone 48N',
      epsg_code: 'EPSG:32648',
      origin_lat: 11.5564,
      origin_lon: 104.9282,
      pixel_scale: 10.0,
      angular_resolution_deg: 0.00009,
      approx_ground_resolution_m: 10.0,
      projected_resolution_m: 10.0,
      geographic_bounds: { minLat: 11.4, maxLat: 11.7, minLon: 104.7, maxLon: 105.1 },
      corner_coordinates_latlng: [[11.7, 104.7], [11.7, 105.1], [11.4, 105.1], [11.4, 104.7]],
      status: 'Completed',
      flood_detected: true,
      floodedAreaHa: '1,890 ha',
      physical_area_ha: 1890,
      coverage_percent: 24.5,
      flood_pixel_count: 189000,
      valid_pixel_count: 771428,
      total_pixels: 1000000,
      confidence_mean: 0.942,
      threshold_used: 0.5,
      area_calculation_method: 'Geodesic Projected Pixel Area',
      spatial_resolution_m: 10.0,
      geospatial_validity: 'Valid',
      inference_latency_ms: 184,
      physical_area_notes: 'Verified Sen1Floods11 dual-sensor SAR + optical fusion model inference.',
      connected_regions: 4,
      affectedRoads: '3 highway bridges submerged',
      affectedBridges: 'Main Street Bridge (CLOSED)',
      isolatedZones: '14,250 residents within 1.5m inundation zone',
      priorityScore: '94.2 CRITICAL',
    };
    setActiveAnalysis(demoSummary);
    setCurrentTab('map');
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
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
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
            activeAnalysis={activeAnalysis}
          />
        )}
        {currentTab === 'map' && (
          <MapView
            activeAnalysis={activeAnalysis}
            onClearAnalysis={() => setActiveAnalysis(null)}
          />
        )}
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

      <DemoScenarioModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectScenario={handleSelectDemoScenario}
      />

      <OfflineIndicator />
    </div>
  );
}
