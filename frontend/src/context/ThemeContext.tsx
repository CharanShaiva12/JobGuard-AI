/**
 * JobGuard AI - Theme & Display Preferences Context
 * Module: frontend.src.context.ThemeContext
 * Purpose: Manages mutually exclusive theme systems:
 *   - System A: Standard Apple-neutral Appearance (Light / Dark / Auto)
 *   - System B: 10 Custom Color Palettes
 * Selecting a custom palette deactivates System A.
 * Selecting Light/Dark/Auto deactivates System B and restores neutral styling.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeName, ColorMode, CookieConsentType } from '../types';
import { api } from '../services/api';

export type ThemeSystemType = 'standard' | 'palette';

interface ThemeContextType {
  themeSystem: ThemeSystemType;
  colorMode: ColorMode;
  selectedPalette: ThemeName | null;
  resolvedMode: 'light' | 'dark';
  setAppearanceMode: (mode: ColorMode) => void;
  setCustomPalette: (palette: ThemeName) => void;
  cookieConsent: CookieConsentType;
  setCookieConsent: (consent: CookieConsentType, customPrefs?: any) => void;
  cookiePreferences: { analytics: boolean; functional: boolean; performance: boolean };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const PALETTE_LIST: { id: ThemeName; name: string; description: string; preview: string; isDark?: boolean }[] = [
  { id: 'royal_blue_cream', name: 'Royal Blue & Cream', description: 'Authoritative corporate blue with ivory warmth', preview: '#1D4ED8' },
  { id: 'cyan_ash_steel', name: 'Cyan Ash & Steel Black', description: 'Analytical cybersecurity cyan and steel slate', preview: '#0891B2' },
  { id: 'vista_blue_oxford', name: 'Vista Blue & Oxford', description: 'Executive navy and balanced light blues', preview: '#1E3A8A' },
  { id: 'forest_leaf', name: 'Forest & Leaf', description: 'Natural green security aesthetic', preview: '#166534' },
  { id: 'electric_mint_carbon', name: 'Electric Mint & Carbon', description: 'Modern high-contrast security mint', preview: '#0D9488' },
  { id: 'wine_red_sand', name: 'Wine Red & Light Sand', description: 'Deep crimson with warm desert sand tones', preview: '#9F1239' },
  { id: 'cherry_alabaster', name: 'Cherry & Alabaster', description: 'Refined rose-tinted forensic theme', preview: '#BE123C' },
  { id: 'midnight_indigo_vanilla', name: 'Midnight Indigo & Vanilla', description: 'Deep indigo paired with soft vanilla', preview: '#3730A3' },
  { id: 'warm_neutral_light', name: 'Warm Neutral Light', description: 'Apple-inspired warm neutral minimalist canvas', preview: '#0071E3' },
  { id: 'carbon_slate_dark', name: 'Carbon Slate Dark', description: 'Dedicated dark slate analytical interface', preview: '#38BDF8', isDark: true },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeSystem, setThemeSystem] = useState<ThemeSystemType>(() => {
    return (localStorage.getItem('jobguard_theme_system') as ThemeSystemType) || 'standard';
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem('jobguard_color_mode') as ColorMode) || 'system';
  });

  const [selectedPalette, setSelectedPaletteState] = useState<ThemeName | null>(() => {
    const saved = localStorage.getItem('jobguard_palette');
    return saved ? (saved as ThemeName) : null;
  });

  const [cookieConsent, setCookieConsentState] = useState<CookieConsentType>(() => {
    return (localStorage.getItem('jobguard_cookie_consent') as CookieConsentType) || 'undecided';
  });

  const [cookiePreferences, setCookiePreferences] = useState({
    analytics: false,
    functional: true,
    performance: true,
  });

  // Calculate system dark mode
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resolvedMode: 'light' | 'dark' =
    colorMode === 'system' ? (systemIsDark ? 'dark' : 'light') : colorMode;

  // Apply theme attributes to root element
  useEffect(() => {
    localStorage.setItem('jobguard_theme_system', themeSystem);
    localStorage.setItem('jobguard_color_mode', colorMode);

    if (themeSystem === 'standard') {
      document.documentElement.setAttribute('data-theme', 'standard');
      document.documentElement.setAttribute('data-mode', resolvedMode);
      localStorage.removeItem('jobguard_palette');
    } else if (selectedPalette) {
      document.documentElement.setAttribute('data-theme', selectedPalette);
      // Determine if selected palette is intrinsically dark or uses resolved mode
      const pal = PALETTE_LIST.find((p) => p.id === selectedPalette);
      document.documentElement.setAttribute('data-mode', pal?.isDark ? 'dark' : resolvedMode);
      localStorage.setItem('jobguard_palette', selectedPalette);
    }
  }, [themeSystem, colorMode, selectedPalette, resolvedMode]);

  // Sync preferences from backend on load
  useEffect(() => {
    const token = localStorage.getItem('jobguard_token');
    if (token) {
      api.getUserPreferences().then((prefs) => {
        if (prefs) {
          if (prefs.theme && prefs.theme !== 'warm_neutral_light') {
            setThemeSystem('palette');
            setSelectedPaletteState(prefs.theme);
          } else {
            setThemeSystem('standard');
            setSelectedPaletteState(null);
          }
          if (prefs.colorMode) setColorModeState(prefs.colorMode);
          if (prefs.cookieConsent) setCookieConsentState(prefs.cookieConsent);
          if (prefs.cookiePreferences) setCookiePreferences(prefs.cookiePreferences);
        }
      }).catch(() => {});
    }
  }, []);

  // Action: Switch to Standard System (Light / Dark / Auto)
  const setAppearanceMode = (mode: ColorMode) => {
    setThemeSystem('standard');
    setSelectedPaletteState(null);
    setColorModeState(mode);
    if (localStorage.getItem('jobguard_token')) {
      api.updateUserPreferences({ theme: 'warm_neutral_light', colorMode: mode }).catch(() => {});
    }
  };

  // Action: Switch to Custom Palette
  const setCustomPalette = (palette: ThemeName) => {
    setThemeSystem('palette');
    setSelectedPaletteState(palette);
    if (localStorage.getItem('jobguard_token')) {
      api.updateUserPreferences({ theme: palette }).catch(() => {});
    }
  };

  const setCookieConsent = (consent: CookieConsentType, customPrefs?: any) => {
    setCookieConsentState(consent);
    localStorage.setItem('jobguard_cookie_consent', consent);
    if (customPrefs) {
      setCookiePreferences(customPrefs);
    }
    if (localStorage.getItem('jobguard_token')) {
      api.updateUserPreferences({
        cookieConsent: consent,
        cookiePreferences: customPrefs || cookiePreferences,
      }).catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeSystem,
        colorMode,
        selectedPalette,
        resolvedMode,
        setAppearanceMode,
        setCustomPalette,
        cookieConsent,
        setCookieConsent,
        cookiePreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
