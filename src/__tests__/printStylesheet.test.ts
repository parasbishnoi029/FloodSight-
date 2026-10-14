import fs from 'fs';
import path from 'path';

describe('Print-Friendly CSS Stylesheet & Reports Print Support', () => {
  const printCssPath = path.resolve(__dirname, '../styles/print.css');
  const indexCssPath = path.resolve(__dirname, '../index.css');
  const indexHtmlPath = path.resolve(__dirname, '../../index.html');
  const reportsPagePath = path.resolve(__dirname, '../pages/Reports.tsx');

  it('verifies that dedicated print.css exists and defines critical print rules', () => {
    expect(fs.existsSync(printCssPath)).toBe(true);
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    // Check media query & page setup
    expect(printCss).toContain('@media print');
    expect(printCss).toContain('@page');
    expect(printCss).toContain('size: A4 portrait');
    expect(printCss).toContain('margin: 10mm 12mm 12mm 12mm');

    // Check ink & contrast rules for physical document printing
    expect(printCss).toContain('background: #ffffff !important');
    expect(printCss).toContain('color: #0f172a !important');
    expect(printCss).toContain('print-color-adjust: exact !important');

    // Check hiding screen navigation & interactive UI
    expect(printCss).toContain('.no-print');
    expect(printCss).toContain('display: none !important');

    // Check metric box formatting
    expect(printCss).toContain('.print-metric-box');
    expect(printCss).toContain('.print-metric-value');
    expect(printCss).toContain('.print-metric-label');
    expect(printCss).toContain('.print-metric-subtext');

    // Check chart and progression gauge formatting
    expect(printCss).toContain('.print-chart-container');
    expect(printCss).toContain('.print-chart-track');
    expect(printCss).toContain('.print-chart-bar-cyan');
    expect(printCss).toContain('.print-chart-bar-amber');
    expect(printCss).toContain('.print-chart-bar-rose');

    // Check table and break-inside rules
    expect(printCss).toContain('break-inside: avoid');
    expect(printCss).toContain('page-break-inside: avoid');

    // Check print-only and screen-only visibility controls
    expect(printCss).toContain('.print-only-header');
    expect(printCss).toContain('.print-only-footer');
    expect(printCss).toContain('.print-only');
  });

  it('verifies that index.css imports print.css', () => {
    expect(fs.existsSync(indexCssPath)).toBe(true);
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');
    expect(indexCss).toMatch(/@import\s+["']\.\/styles\/print\.css["']/);
  });

  it('verifies that index.html links print.css with media="print"', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(indexHtml).toContain('rel="stylesheet"');
    expect(indexHtml).toContain('/src/styles/print.css');
    expect(indexHtml).toContain('media="print"');
  });

  it('verifies that Reports.tsx integrates print triggers, print headers, and chart formatting', () => {
    expect(fs.existsSync(reportsPagePath)).toBe(true);
    const reportsCode = fs.readFileSync(reportsPagePath, 'utf8');

    // Check window.print trigger
    expect(reportsCode).toContain('window.print()');
    expect(reportsCode).toContain('Printer');

    // Check print-only document header and classification
    expect(reportsCode).toContain('print-only-header');
    expect(reportsCode).toContain('EARTH OBSERVATION INCIDENT STATUS SUMMARY (ICS-209 / SITREP)');
    expect(reportsCode).toContain('FLOODSIGHT AI');

    // Check critical flood intelligence charts
    expect(reportsCode).toContain('print-chart-container');
    expect(reportsCode).toContain('print-chart-track');
    expect(reportsCode).toContain('print-chart-bar-cyan');
    expect(reportsCode).toContain('Surface Water Inundation Scale (Hectares)');
    expect(reportsCode).toContain('Hydrological Crest Stage Gauge');

    // Check metric formatting classes
    expect(reportsCode).toContain('print-metric-box');
    expect(reportsCode).toContain('print-metric-value');
    expect(reportsCode).toContain('print-metric-label');

    // Check print-only footer
    expect(reportsCode).toContain('print-only-footer');
    expect(reportsCode).toContain('INCIDENT COMMAND AUTHORIZATION');

    // Check no-print classes on interactive toolbar
    expect(reportsCode).toContain('no-print');
  });
});
