const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Output file paths
const outputRootPath = path.resolve(__dirname, '../FloodSight_AI_User_Manual.pdf');
const outputPublicPath = path.resolve(__dirname, '../public/FloodSight_AI_User_Manual.pdf');

// Create document with standard margins
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 54, bottom: 54, left: 54, right: 54 },
  autoFirstPage: false,
  bufferPages: true,
});

const writeStream = fs.createWriteStream(outputRootPath);
doc.pipe(writeStream);

// Colors matching FloodSight design tokens
const COLORS = {
  navyDark: '#080D14',
  navySurface: '#101925',
  slateNavy: '#162231',
  border: '#263446',
  tealAccent: '#177E89',
  tealLight: '#E8F6F8',
  tealDark: '#0E5C64',
  textDark: '#111827',
  textMuted: '#4B5563',
  textLight: '#9CA3AF',
  cardBg: '#F8FAFC',
  cardBorder: '#E2E8F0',
  alertBg: '#FEF2F2',
  alertBorder: '#EF4444',
  alertText: '#991B1B',
  warnBg: '#FFFBEB',
  warnBorder: '#F59E0B',
  warnText: '#92400E',
  infoBg: '#F0FDF4',
  infoBorder: '#10B981',
  infoText: '#065F46',
};

// ==========================================
// 1. COVER PAGE
// ==========================================
doc.addPage();
const pageWidth = doc.page.width;
const pageHeight = doc.page.height;

// Top dark banner
doc.rect(0, 0, pageWidth, 280).fill('#080D14');

// Accent teal glow line
doc.rect(0, 276, pageWidth, 4).fill(COLORS.tealAccent);

// Brand Badge
doc.roundedRect(54, 54, 150, 24, 4).fill(COLORS.slateNavy);
doc.fillColor('#39B8C8').fontSize(10).font('Helvetica-Bold').text('EARTH OBSERVATION', 62, 61);

// Title
doc.fillColor('#FFFFFF').fontSize(36).font('Helvetica-Bold').text('FloodSight AI', 54, 96);
doc.fillColor('#39B8C8').fontSize(16).font('Helvetica-Bold').text('Comprehensive Operations & User Manual', 54, 142);

// Subtitle
doc.fillColor('#AAB8C8').fontSize(11).font('Helvetica').text(
  'Evidence-Based Satellite Mapping, Verification Gates, Live Radar & Inundation Intelligence',
  54,
  168,
  { width: 480 }
);

// Metadata box on cover
doc.roundedRect(54, 210, 487, 44, 4).fill('#101925');
doc.fillColor('#39B8C8').fontSize(9).font('Helvetica-Bold').text('SYSTEM VERSION:', 64, 218);
doc.fillColor('#F3F5F7').font('Helvetica').text('1.0.0-sen1floods11', 170, 218);

doc.fillColor('#39B8C8').fontSize(9).font('Helvetica-Bold').text('CHALLENGE TRACK:', 64, 232);
doc.fillColor('#F3F5F7').font('Helvetica').text('Track B: Mapping Flood Damage From Space', 170, 232);

doc.fillColor('#39B8C8').fontSize(9).font('Helvetica-Bold').text('POLICY INTEGRITY:', 330, 218);
doc.fillColor('#10B981').font('Helvetica-Bold').text('ZERO-FABRICATION GUARANTEED', 425, 218);

doc.fillColor('#39B8C8').fontSize(9).font('Helvetica-Bold').text('RELEASE DATE:', 330, 232);
doc.fillColor('#F3F5F7').font('Helvetica').text('October 2026', 425, 232);

// Cover Lower Area
let coverY = 320;
doc.fillColor(COLORS.textDark).fontSize(14).font('Helvetica-Bold').text('Executive Documentation Summary', 54, coverY);
coverY += 24;

doc.fillColor(COLORS.textMuted).fontSize(10).font('Helvetica').text(
  'FloodSight AI transforms raw multi-spectral satellite imagery into verifiable flood extent, transportation network exposure, and community isolation intelligence. This document serves as the authoritative operational guide for emergency response personnel, geospatial specialists, and incident command logisticians operating the platform.',
  54,
  coverY,
  { width: 487, lineGap: 4 }
);
coverY += 68;

// 4 Feature Highlight Cards on Cover
const cards = [
  { title: 'Verifiable Ingestion', desc: 'Pre-inference verification of Sentinel-2 MSI GeoTIFF headers, bands, and EPSG CRS tags.' },
  { title: 'Fail-Closed Guardrails', desc: 'Zero synthetic outputs; returns HTTP 503 if model weights are missing.' },
  { title: 'Live Radar & Forecasts', desc: 'Real-time RainViewer radar mosaics with playback and Open-Meteo precipitation.' },
  { title: 'ICS-209 Reporting', desc: 'Standardized operational incident briefings grounded exclusively in measured telemetry.' },
];

cards.forEach((c, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const cardX = 54 + col * 250;
  const cardY = coverY + row * 90;

  doc.roundedRect(cardX, cardY, 237, 78, 6).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
  doc.rect(cardX, cardY, 4, 78).fill(COLORS.tealAccent);
  doc.fillColor(COLORS.textDark).fontSize(11).font('Helvetica-Bold').text(c.title, cardX + 14, cardY + 12);
  doc.fillColor(COLORS.textMuted).fontSize(9).font('Helvetica').text(c.desc, cardX + 14, cardY + 28, { width: 210, lineGap: 2 });
});

// Bottom Warning on Cover
doc.roundedRect(54, 720, 487, 50, 6).fillAndStroke(COLORS.warnBg, COLORS.warnBorder);
doc.fillColor(COLORS.warnText).fontSize(9.5).font('Helvetica-Bold').text('OPERATIONAL SCOPE & ETHICAL NOTICE', 66, 728);
doc.fillColor(COLORS.warnText).fontSize(8.5).font('Helvetica').text(
  'FloodSight AI is a decision-support platform designed to assist emergency management agencies. Satellite flood masks detect surface water accumulation and must be combined with ground reconnaissance for structural collapse verification.',
  66,
  742,
  { width: 463, lineGap: 2 }
);

// ==========================================
// HELPER DRAWING FUNCTIONS
// ==========================================
function checkPageBreak(neededHeight = 60) {
  if (doc.y + neededHeight > doc.page.height - 60) {
    doc.addPage();
    doc.y = 60;
  }
}

function addChapterHeader(num, title) {
  checkPageBreak(80);
  doc.moveDown(0.5);
  doc.roundedRect(54, doc.y, 487, 28, 4).fill(COLORS.navyDark);
  doc.fillColor('#39B8C8').fontSize(11).font('Helvetica-Bold').text(`CHAPTER ${num}`, 64, doc.y - 20);
  doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text(title, 140, doc.y - 20);
  doc.y += 18;
  doc.moveDown(0.5);
}

function addSectionHeader(title) {
  checkPageBreak(50);
  doc.fillColor(COLORS.tealDark).fontSize(12).font('Helvetica-Bold').text(title, 54, doc.y);
  doc.strokeColor(COLORS.cardBorder).lineWidth(1).moveTo(54, doc.y + 2).lineTo(541, doc.y + 2).stroke();
  doc.y += 6;
  doc.moveDown(0.3);
}

function addParagraph(text) {
  checkPageBreak(40);
  doc.fillColor(COLORS.textDark).fontSize(9.5).font('Helvetica').text(text, 54, doc.y, {
    width: 487,
    lineGap: 3,
  });
  doc.moveDown(0.4);
}

function addBullet(title, desc) {
  checkPageBreak(25);
  doc.fillColor(COLORS.tealDark).fontSize(9.5).font('Helvetica-Bold').text(`•  ${title}: `, 64, doc.y, { continued: true });
  doc.fillColor(COLORS.textDark).font('Helvetica').text(desc, { width: 477, lineGap: 2 });
  doc.moveDown(0.25);
}

function addCallout(type, title, text) {
  checkPageBreak(55);
  const bg = type === 'alert' ? COLORS.alertBg : type === 'warn' ? COLORS.warnBg : COLORS.tealLight;
  const border = type === 'alert' ? COLORS.alertBorder : type === 'warn' ? COLORS.warnBorder : COLORS.tealAccent;
  const textColor = type === 'alert' ? COLORS.alertText : type === 'warn' ? COLORS.warnText : COLORS.tealDark;

  const startY = doc.y;
  doc.roundedRect(54, startY, 487, 50, 4).fillAndStroke(bg, border);
  doc.rect(54, startY, 4, 50).fill(border);
  doc.fillColor(textColor).fontSize(9.5).font('Helvetica-Bold').text(title, 66, startY + 8);
  doc.fillColor(textColor).fontSize(8.5).font('Helvetica').text(text, 66, startY + 22, { width: 465, lineGap: 2 });
  doc.y = startY + 58;
}

function addTable(headers, rows, colWidths) {
  checkPageBreak(30 + rows.length * 20);
  const startX = 54;
  let currentY = doc.y;

  // Header row
  doc.rect(startX, currentY, 487, 20).fill(COLORS.navyDark);
  let curX = startX;
  headers.forEach((h, i) => {
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text(h, curX + 6, currentY + 5, { width: colWidths[i] - 12 });
    curX += colWidths[i];
  });
  currentY += 20;

  // Data rows
  rows.forEach((row, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? '#FFFFFF' : COLORS.cardBg;
    doc.rect(startX, currentY, 487, 18).fillAndStroke(rowBg, COLORS.cardBorder);
    let rX = startX;
    row.forEach((cell, cIdx) => {
      doc.fillColor(COLORS.textDark).fontSize(8).font('Helvetica').text(cell, rX + 6, currentY + 4, { width: colWidths[cIdx] - 12 });
      rX += colWidths[cIdx];
    });
    currentY += 18;
  });

  doc.y = currentY + 10;
}

// ==========================================
// 2. TABLE OF CONTENTS
// ==========================================
doc.addPage();
doc.y = 54;
doc.fillColor(COLORS.navyDark).fontSize(20).font('Helvetica-Bold').text('Table of Contents', 54, doc.y);
doc.strokeColor(COLORS.tealAccent).lineWidth(2).moveTo(54, doc.y + 4).lineTo(150, doc.y + 4).stroke();
doc.y += 18;

const tocItems = [
  { num: '1', title: 'Executive Overview & System Mission' },
  { num: '2', title: 'Interface Architecture & Getting Started' },
  { num: '3', title: 'Interactive 3D Earth & Global Geographic Navigation' },
  { num: '4', title: 'Satellite Raster Verification & Flood Segmentation' },
  { num: '5', title: 'Tactical Geospatial Maps & Live Environmental Layers' },
  { num: '6', title: '3D Topographic Simulation & Digital Elevation Modeling' },
  { num: '7', title: 'Incident Command Briefings & Situation Reports (SITREPs)' },
  { num: '8', title: 'Metric Formulations, Geospatial Calculations & Verification Rules' },
  { num: '9', title: 'Troubleshooting, Error Reference & Safe Recovery' },
  { num: '10', title: 'Data Governance, Security Architecture & Scientific Integrity' },
  { num: '11', title: 'Quick Reference Appendices (Checklist, Glossary & API Matrix)' },
];

tocItems.forEach((item) => {
  doc.roundedRect(54, doc.y, 487, 26, 4).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
  doc.fillColor(COLORS.tealDark).fontSize(10).font('Helvetica-Bold').text(`Chapter ${item.num}:`, 64, doc.y + 7);
  doc.fillColor(COLORS.textDark).fontSize(10).font('Helvetica-Bold').text(item.title, 140, doc.y + 7);
  doc.y += 32;
});

// ==========================================
// CHAPTER 1
// ==========================================
addChapterHeader('1', 'Executive Overview & System Mission');
addSectionHeader('1.1 Purpose & Target Users');
addParagraph('FloodSight AI is a specialized Earth-observation intelligence platform developed for Track B: Mapping Flood Damage From Space. It processes high-resolution multi-spectral satellite imagery (Sentinel-2 MSI) to determine pixel-level flood extent, infrastructure disruption, and community isolation during catastrophic hydrological events.');
addBullet('Incident Commanders & EOC Directors', 'Formulate operational triage decisions and resource allocations based on verified cartographic evidence.');
addBullet('Geospatial & Remote Sensing Engineers', 'Inspect coordinate reference systems (CRS), ground sampling distances (GSD), and band alignments.');
addBullet('Field Logisticians', 'Identify accessible transportation corridors, submerged bridges, and stranded population centers.');

addSectionHeader('1.2 System Requirements');
addParagraph('The web application is accessible on modern desktop command center browsers with WebGL 2.0 hardware acceleration enabled:');
addBullet('Recommended Browsers', 'Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+, Apple Safari 16.4+');
addBullet('Hardware', 'Dedicated GPU or modern multi-core SoC (Apple Silicon, Intel Iris Xe, AMD Radeon, NVIDIA GeForce) for real-time 3D Earth rendering.');
addBullet('Network Bandwidth', 'Minimum 5 Mbps broadband for satellite raster uploads and real-time RainViewer radar tile streams.');

addSectionHeader('1.3 Zero-Fabrication Commitment');
addCallout('alert', 'MANDATORY SCIENTIFIC POLICY: ZERO FABRICATION', 'FloodSight AI strictly prohibits synthetic, fabricated, or simulated measurements. If a model checkpoint is absent, inference is refused with an explicit HTTP 503 error. All metrics are derived from authenticated data sources.');

// ==========================================
// CHAPTER 2
// ==========================================
addChapterHeader('2', 'Interface Architecture & Getting Started');
addSectionHeader('2.1 Persistent Navigation Bar');
addParagraph('The top navigation bar provides instant access to all core platform workspaces, status indicators, and emergency tools:');
addBullet('Overview (H)', '3D global Earth visualization, observation target camera flights, and platform architecture overview.');
addBullet('Command Hub (D)', 'Central operations center reporting system health, model readiness, and recent raster analyses.');
addBullet('Analysis (A)', 'Satellite imagery ingestion portal, cryptographic verification gate, and U-Net segmentation engine.');
addBullet('Tactical Maps (M)', 'High-resolution Leaflet and Google maps featuring live RainViewer radar, Open-Meteo forecasts, and flood extent overlays.');
addBullet('Reports (R)', 'ICS-209 compliant incident situation reports for 20 global disasters or your active uploaded analysis.');
addBullet('Methodology (I)', 'Comprehensive 8-stage scientific workflow documentation and dataset contracts.');

addSectionHeader('2.2 Command Center Global Keyboard Shortcuts');
addParagraph('For high-tempo emergency operations, single-key shortcuts allow immediate workspace transitions without mouse usage:');
addTable(
  ['Key', 'Destination Workspace', 'Functionality Description'],
  [
    ['H', 'Overview / Landing', 'Planetary Earth globe, target selector, and 3D simulation'],
    ['D', 'Command Hub', 'System health status, recent chip telemetry, quick workflows'],
    ['A', 'Analysis Laboratory', 'Upload GeoTIFF rasters, run verification, execute inference'],
    ['M', 'Tactical Maps', 'Live weather radar, Google tactical maps, 3D terrain'],
    ['R', 'Reports & SITREPs', 'Operational incident briefings and situation reports'],
    ['I', 'Methodology', 'Dataset contracts, scientific pipeline documentation'],
    ['?', 'Shortcuts Modal', 'Displays the global interactive keyboard shortcuts help'],
    ['Esc', 'Dismiss / Close', 'Closes modals, floating cards, and active menus'],
  ],
  [45, 140, 302]
);

// ==========================================
// CHAPTER 3
// ==========================================
addChapterHeader('3', 'Interactive 3D Earth & Global Geographic Navigation');
addSectionHeader('3.1 3D Globe Navigation (Orbit, Pan, Zoom)');
addParagraph('The planetary Earth visualization on the Overview workspace is rendered via Three.js with multi-spectral surface textures, atmospheric scattering shaders, and physical planetary rotation:');
addBullet('Orbit Navigation', 'Left-click + drag orbits the planet smoothly around its polar axis.');
addBullet('Zoom Altitude', 'Scroll wheel or trackpad pinch zooms between orbital view (z = 4.2) and continental altitude (z = 2.0).');
addBullet('Camera Controls', 'Zoom In (+), Zoom Out (-), and Reset Globe View buttons located in the bottom-right corner.');

addSectionHeader('3.2 Observation Targets Console');
addParagraph('The Observation Targets selector features 20 pre-validated disaster incidents from the global registry (e.g., Pakistan Sindh, USA Kentucky, Bangladesh Sylhet). Clicking any target triggers a smooth 700ms cubic-eased camera flight directly to the coordinates.');
addCallout('warn', 'OPERATIONAL NOTICE: ILLUSTRATIVE GLOBE VS VERIFIED MAP', 'The 3D globe provides geographic discovery and situational orientation. The glowing hotspot rings represent incident epicenters. Tactically verified flood extents and evacuation routes must be inspected on the Tactical Map.');

// ==========================================
// CHAPTER 4
// ==========================================
addChapterHeader('4', 'Satellite Raster Verification & Flood Segmentation');
addSectionHeader('4.1 Model Input Contract (s2-optical-v1)');
addParagraph('FloodSight AI enforces an explicit model input specification to ensure reproducible, scientifically defensible segmentation:');
addTable(
  ['Parameter', 'Contract Requirement', 'Technical Rationale'],
  [
    ['Sensor Platform', 'ESA Sentinel-2 MSI', 'Calibrated against Sen1Floods11 splits'],
    ['File Format', 'GeoTIFF (.tif, .tiff)', 'Requires valid TIFF magic headers'],
    ['Bands & Order', '3 Bands: B4 (Red), B3 (Green), B2 (Blue)', 'Optical multi-spectral water contrast'],
    ['Tile Dimensions', 'Exactly 512 x 512 pixels', 'Neural network tensor input requirement'],
    ['Ground Resolution', '10.0 meters / pixel', 'Native Sentinel-2 optical ground sampling distance'],
    ['Coordinate Reference', 'Embedded EPSG tags, ModelPixelScaleTag', 'Mandatory for physical geodesic hectarage'],
  ],
  [100, 180, 207]
);

addSectionHeader('4.2 Pre-Inference Server Verification Gate (/api/verify-image)');
addParagraph('All rasters must pass server-side verification before entering the inference pipeline. The gateway checks:');
addBullet('File Integrity', 'Validates non-empty buffer and decodable TIFF/BigTIFF magic headers.');
addBullet('Spatial Dimensions', 'Verifies width and height equal exactly 512x512 pixels.');
addBullet('Modality & Channels', 'Validates 3-band optical mapping and EPSG projection tags.');
addBullet('Verification Token', 'Registers a cryptographically random UUIDv4 token in the server SafeTokenRegistry with a 1-hour TTL.');

addSectionHeader('4.3 Fail-Closed Inference Gate (/api/analyze)');
addCallout('alert', 'MODEL CHECKPOINT GUARDRAIL', 'If no trained model checkpoint exists at models/flood_segmentation/floodsight_unet_resnet34_best.pth, inference returns HTTP 503 FLOOD_MODEL_UNAVAILABLE. No synthetic masks or placeholders will ever be generated.');

// ==========================================
// CHAPTER 5
// ==========================================
addChapterHeader('5', 'Tactical Geospatial Maps & Live Environmental Layers');
addSectionHeader('5.1 Live Weather Radar & Precipitation Loops');
addParagraph('The Tactical Maps workspace incorporates real-time radar mosaics from RainViewer and weather forecasts from Open-Meteo:');
addBullet('Radar Timeline', 'Provides the past 2 hours of observed radar reflectivity at 10-minute intervals, plus 30 minutes of nowcast predictive frames.');
addBullet('Playback Controls', 'Play/Pause animation, Skip Back, Skip Forward, and adjustable playback speed (500ms to 2000ms per frame).');
addBullet('Color Palettes', 'Select between Universal Blue (Default), RainViewer Classic, and Titan Spectrum.');

addSectionHeader('5.2 Meteorological Telemetry & Hourly Forecasts');
addParagraph('Live queries to Open-Meteo display real-time micro-climate indicators for the selected coordinate center:');
addBullet('Current Telemetry', 'Temperature (°C), Relative Humidity (%), Wind Speed (km/h), Wind Direction (degrees), Surface Pressure (hPa), Precipitation Rate (mm/h).');
addBullet('48-Hour Rainfall Forecast', 'Visual precipitation chart predicting rainfall accumulation over the next two days to project crest timing.');

addCallout('warn', 'OPERATIONAL WARNING: WEATHER RADAR VS. SATELLITE INUNDATION', 'Weather radar indicates atmospheric rain in the clouds. Satellite optical/SAR imagery indicates standing floodwater on the ground. Never dispatch rescue boats based solely on radar rain reflectivity.');

// ==========================================
// CHAPTER 6
// ==========================================
addChapterHeader('6', '3D Topographic Simulation & Digital Elevation Modeling');
addSectionHeader('6.1 Interactive 3D Terrain Viewer');
addParagraph('Rendered via Three.js / React Three Fiber, the 3D terrain viewer models representative regional elevation geometries:');
addBullet('Extrusion Scale Slider (1.0x - 5.0x)', 'Exaggerates vertical elevation relief to emphasize subtle drainage basins, ridges, and natural levees.');
addBullet('Water Level Slider (0.0 - 1.0)', 'Simulates rising water column stage heights, demonstrating how valleys and lowlands become inundated.');
addBullet('Procedural Disclosure', 'Representative terrain models are procedural approximations designed for hydraulic stage intuition, not LiDAR-grade engineering surveys.');

// ==========================================
// CHAPTER 7
// ==========================================
addChapterHeader('7', 'Incident Command Briefings & Situation Reports (SITREPs)');
addSectionHeader('7.1 ICS-209 Incident Situation Reports');
addParagraph('The Reports workspace formats verified satellite metrics into standardized Incident Command System briefings:');
addBullet('Global Disaster SITREPs', 'Pre-configured situation reports for 20 benchmarked global flood disasters.');
addBullet('Active Upload Intelligence', 'Auto-generated briefing based exclusively on your freshly uploaded satellite scene.');
addBullet('Zero-Fabrication Guardrail', 'If road vectors or demographic census datasets are absent, reports explicitly state "DATASET MISSING" rather than estimating numbers.');

// ==========================================
// CHAPTER 8
// ==========================================
addChapterHeader('8', 'Metric Formulations & Geospatial Calculations');
addSectionHeader('8.1 Mathematical Formulations');
addParagraph('Every metric displayed on FloodSight AI is computed through deterministic mathematical formulas:');
addBullet('Flood Coverage Fraction', 'f = N_flood / N_valid, where N_valid represents non-NoData pixels.');
addBullet('Mean Confidence Score', 'Average positive-class probability across all pixels classified as water (P >= threshold).');
addBullet('Projected Hectarage (UTM)', 'Area (ha) = (N_flood * Delta_x * Delta_y) / 10,000, where Delta_x and Delta_y are in meters.');
addBullet('Geodesic Hectarage (WGS84)', 'Calculated via ellipsoidal arc distance formulas scaled by local latitude cosine factors.');

// ==========================================
// CHAPTER 9
// ==========================================
addChapterHeader('9', 'Troubleshooting, Error Reference & Safe Recovery');
addSectionHeader('9.1 Diagnostic Error Matrix');
addTable(
  ['Error Code / Symptom', 'Root Cause Diagnosis', 'Safe Operator Recovery Action'],
  [
    ['REJECTED: Magic Header', 'Corrupted file or non-TIFF format', 'Re-export as uncompressed GeoTIFF (.tif)'],
    ['MODEL_DIMENSION_MISMATCH', 'Raster size is not 512x512', 'Resample or tile the image to 512x512 pixels'],
    ['HTTP 503 FLOOD_MODEL_UNAVAILABLE', 'Model weights missing on server', 'Install trained checkpoint at models/flood_segmentation/'],
    ['HTTP 403 VERIFICATION_REQUIRED', 'Token expired (1 hour TTL)', 'Click "Run Integrity Verification" to re-authenticate'],
    ['STALE DATA / SOURCE UNAVAILABLE', 'RainViewer / Open-Meteo timeout', 'Click "Refresh Telemetry"; previous data remains viewable'],
    ['WebGL Context Lost', 'Hardware acceleration disabled', 'Enable "Use hardware acceleration" in browser settings'],
  ],
  [120, 150, 217]
);

// ==========================================
// CHAPTER 10
// ==========================================
addChapterHeader('10', 'Data Governance, Security Architecture & Scientific Integrity');
addSectionHeader('10.1 In-Memory Token Lifecycle (SafeTokenRegistry)');
addParagraph('Verification tokens are maintained in-memory on the backend gateway with strict safeguards:');
addBullet('Automatic TTL Pruning', 'Verification records automatically expire after 1 hour (3,600,000 ms).');
addBullet('Memory Capacity Cap', 'Maximum 1,000 records maintained simultaneously to prevent memory exhaustion.');
addBullet('Privacy Assurance', 'Uploaded satellite scenes are analyzed in local memory and are not uploaded to third-party cloud buckets.');

// ==========================================
// CHAPTER 11
// ==========================================
addChapterHeader('11', 'Quick Reference Appendices');
addSectionHeader('11.1 Operational Analysis Checklist');
addParagraph('Follow this sequential procedure for every satellite analysis mission:');
addBullet('Step 1: Check System Health', 'Ensure Command Hub (D) reports HEALTHY with trained model checkpoint detected.');
addBullet('Step 2: Format Satellite Scene', 'Ensure GeoTIFF is 512x512 pixels, 3 bands (B4/B3/B2), with embedded EPSG georeferencing.');
addBullet('Step 3: Run Server Verification', 'Upload file in Analysis (A) and verify green VERIFIED_SATELLITE_INPUT status.');
addBullet('Step 4: Select Operating Threshold', 'Set probability threshold slider (default: 0.50).');
addBullet('Step 5: Execute U-Net Segmentation', 'Click Execute U-Net Flood Analysis and inspect coverage % and physical hectarage.');
addBullet('Step 6: Review Situation Briefing', 'Switch to Reports (R) -> Active Upload to inspect the standardized incident briefing.');

addSectionHeader('11.2 API Gateway Reference');
addTable(
  ['Endpoint Path', 'HTTP Method', 'Function & Return Codes'],
  [
    ['/api/health', 'GET', 'System status, model availability (200 OK)'],
    ['/api/verify-image', 'POST', 'Inspects GeoTIFF headers, issues verification token (200 OK, 400, 415)'],
    ['/api/analyze', 'POST', 'Executes U-Net segmentation (200 OK, 403 Forbidden, 503 Unavailable)'],
    ['/api/external/weather-radar', 'GET', 'Proxies live RainViewer radar frames (200 OK, 502, 504 Timeout)'],
    ['/api/external/weather-forecast', 'GET', 'Proxies Open-Meteo precipitation forecast (200 OK, 400, 504)'],
    ['/api/external/hydrology', 'GET', 'GloFAS river discharge telemetry (200 OK / disclosed nulls)'],
  ],
  [140, 60, 287]
);

// ==========================================
// PAGE NUMBERING PASS
// ==========================================
const totalPages = doc.bufferedPageRange().count;

for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);

  // Skip cover page for running header/footer
  if (i > 0) {
    // Running header
    doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text('FloodSight AI — Operations & User Manual', 54, 32);
    doc.fillColor(COLORS.tealAccent).fontSize(8).font('Helvetica-Bold').text('CONFIDENTIAL & OPERATIONAL', 400, 32, { align: 'right' });
    doc.strokeColor(COLORS.cardBorder).lineWidth(0.5).moveTo(54, 44).lineTo(541, 44).stroke();

    // Running footer
    doc.strokeColor(COLORS.cardBorder).lineWidth(0.5).moveTo(54, 792).lineTo(541, 792).stroke();
    doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text('Zero-Fabrication Earth Observation Platform', 54, 800);
    doc.fillColor(COLORS.textDark).fontSize(8).font('Helvetica-Bold').text(`Page ${i + 1} of ${totalPages}`, 400, 800, { align: 'right' });
  }
}

// Finalize document
doc.end();

writeStream.on('finish', () => {
  console.log(`Successfully generated ${outputRootPath}`);

  // Ensure public folder copy exists for in-app download
  fs.copyFileSync(outputRootPath, outputPublicPath);
  console.log(`Successfully copied to ${outputPublicPath}`);
});
