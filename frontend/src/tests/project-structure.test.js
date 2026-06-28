// @vitest-environment node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─────────────────────────────────────────────
// package.json — dependency integrity
// ─────────────────────────────────────────────

describe('package.json dependency integrity', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

  it('has exactly the expected production dependencies', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['react', 'react-dom']);
  });

  it('has only known dev dependencies — no unexpected packages', () => {
    const known = [
      '@eslint/js',
      '@testing-library/jest-dom',
      '@testing-library/react',
      '@types/react',
      '@types/react-dom',
      '@vitejs/plugin-react',
      'eslint',
      'eslint-plugin-react-hooks',
      'eslint-plugin-react-refresh',
      'globals',
      'jsdom',
      'vite',
      'vitest',
    ];
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(known.sort());
  });
});

// ─────────────────────────────────────────────
// package-lock.json — root entries must match package.json
// ─────────────────────────────────────────────

describe('package-lock.json integrity', () => {
  const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

  it('lock file root production deps match package.json', () => {
    const rootPkg = lock.packages[''] || {};
    expect(Object.keys(rootPkg.dependencies || {}).sort())
      .toEqual(Object.keys(pkg.dependencies || {}).sort());
  });

  it('lock file root dev deps match package.json', () => {
    const rootPkg = lock.packages[''] || {};
    expect(Object.keys(rootPkg.devDependencies || {}).sort())
      .toEqual(Object.keys(pkg.devDependencies || {}).sort());
  });

  it('root package has no @emnapi entries as direct dependencies', () => {
    const rootPkg = lock.packages[''] || {};
    const allRootDeps = [
      ...Object.keys(rootPkg.dependencies || {}),
      ...Object.keys(rootPkg.devDependencies || {}),
    ];
    expect(allRootDeps).not.toContain('@emnapi/core');
    expect(allRootDeps).not.toContain('@emnapi/runtime');
  });
});

// ─────────────────────────────────────────────
// vite.config.js — proxy target
// ─────────────────────────────────────────────

describe('vite.config.js proxy', () => {
  const config = readFileSync(resolve(ROOT, 'vite.config.js'), 'utf8');

  it('uses 127.0.0.1 as proxy target to avoid Windows IPv6 resolution', () => {
    expect(config).toContain('http://127.0.0.1:8000');
  });

  it('does not use localhost as proxy target', () => {
    expect(config).not.toContain('http://localhost:8000');
  });
});

// ─────────────────────────────────────────────
// AnalyticsDashboard — when the component exists
// ─────────────────────────────────────────────

describe('AnalyticsDashboard (when present)', () => {
  const dashboardPath = resolve(__dirname, '../components/AnalyticsDashboard.jsx');
  const appPath = resolve(__dirname, '../App.jsx');

  it('uses CSS variables only — no hardcoded hex colors', () => {
    if (!existsSync(dashboardPath)) return;
    const source = readFileSync(dashboardPath, 'utf8');
    const hexMatches = source.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(hexMatches).toHaveLength(0);
  });

  it('is rendered after the TokenizerPanel components in App.jsx', () => {
    const app = readFileSync(appPath, 'utf8');
    const analyticsIdx = app.indexOf('<AnalyticsDashboard');
    if (analyticsIdx === -1) return; // not yet added — skip
    const panelsIdx = app.indexOf('<TokenizerPanel');
    expect(panelsIdx).toBeGreaterThan(-1);
    expect(analyticsIdx).toBeGreaterThan(panelsIdx);
  });
});
