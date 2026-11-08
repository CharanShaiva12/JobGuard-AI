/**
 * JobGuard AI - Theme & Display Preferences Modal
 * Module: frontend.src.components.common.ThemeModal
 * Purpose: Clean, uncluttered theme selector supporting standard appearance modes and custom palettes.
 */

import React from 'react';
import { useTheme, PALETTE_LIST } from '../../context/ThemeContext';
import { ColorMode } from '../../types';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const {
    themeSystem,
    colorMode,
    selectedPalette,
    setAppearanceMode,
    setCustomPalette,
  } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl border border-[var(--border-strong)] shadow-2xl overflow-hidden p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-bold tracking-tight">Display &amp; Themes</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section 1: Standard Appearance */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5">
            Appearance
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['light', 'dark', 'system'] as ColorMode[]).map((mode) => {
              const isActive = themeSystem === 'standard' && colorMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAppearanceMode(mode)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border capitalize transition-all ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {mode === 'system' ? 'Auto (System)' : `${mode}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Color Palettes */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5">
            Color Palettes
          </label>

          <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
            {PALETTE_LIST.map((t) => {
              const isSelected = themeSystem === 'palette' && selectedPalette === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCustomPalette(t.id)}
                  className={`flex items-center gap-2.5 p-2.5 text-left rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)] font-bold text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/80 shadow-xs"
                    style={{ backgroundColor: t.preview }}
                  />
                  <span className="text-xs truncate">
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3.5 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
