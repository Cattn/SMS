import type { M3Theme, ColorScheme } from './types';
import { generateM3Theme, type SchemeType } from './generator';
import { removeAlphaFromHex } from './converter';
import { browser } from '$app/environment';
import { configState, updateThemeConfig } from '$lib/config.svelte';

const DEFAULT_SOURCE_COLOR = '#8f4a4c';

interface ThemeState {
    currentTheme: M3Theme | null;
    isDark: boolean;
    sourceColor: string;
}

const themeState = $state<ThemeState>({
    currentTheme: null,
    isDark: true,
    sourceColor: DEFAULT_SOURCE_COLOR
});

const currentScheme = $derived<ColorScheme | null>(
    themeState.currentTheme 
        ? (themeState.isDark ? themeState.currentTheme.dark : themeState.currentTheme.light)
        : null
);

function readCurrentScheme(): ColorScheme | null {
    return themeState.currentTheme
        ? (themeState.isDark ? themeState.currentTheme.dark : themeState.currentTheme.light)
        : null;
}

function shouldUseM3Theme(): boolean {
    const sourceColorRgb = removeAlphaFromHex(themeState.sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    return sourceColorRgb !== defaultColorRgb;
}

function applySchemeToCSS(scheme: ColorScheme): void {
    if (!browser) return;
    
    const root = document.documentElement;
    
    const toCSSVar = (key: string): string => {
        return '--m3-scheme-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    };
    
    Object.entries(scheme).forEach(([key, value]) => {
        root.style.setProperty(toCSSVar(key), value);
    });

    try {
        window.localStorage.setItem('smsThemeScheme', JSON.stringify(scheme));
    } catch { void 0; }
}

export function setThemeFromSourceColor(sourceColor: string): void {
    configState.theme.sourceColor = sourceColor;
    themeState.sourceColor = sourceColor;
    
    const sourceColorRgb = removeAlphaFromHex(sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    
    if (sourceColorRgb !== defaultColorRgb) {
        themeState.currentTheme = generateM3Theme(sourceColor, configState.theme.schemeType);
        const scheme = readCurrentScheme();
        if (scheme) {
            applySchemeToCSS(scheme);
        }
    } else {
        themeState.currentTheme = null;
        if (browser) {
            const root = document.documentElement;
            const m3Props = Array.from(root.style).filter(prop => prop.startsWith('--m3-scheme-'));
            m3Props.forEach(prop => root.style.removeProperty(prop));
        }
        try {
            window.localStorage.removeItem('smsThemeScheme');
        } catch { void 0; }
    }
    
    updateThemeConfig(sourceColor, themeState.isDark);
}

export function setDarkMode(isDark: boolean): void {
    configState.general.darkModeEnabled = isDark;
    configState.theme.isDarkMode = isDark;
    themeState.isDark = isDark;
    
    if (shouldUseM3Theme()) {
        const scheme = readCurrentScheme();
        if (scheme) {
            applySchemeToCSS(scheme);
        }
    }
    
    updateThemeConfig(themeState.sourceColor, isDark);
}

export function setCustomTheme(theme: M3Theme): void {
    themeState.currentTheme = theme;
    
    const scheme = readCurrentScheme();
    if (scheme) {
        applySchemeToCSS(scheme);
    }
}

export function getCurrentTheme(): M3Theme | null {
    return themeState.currentTheme;
}

export function getCurrentScheme(): ColorScheme | null {
    return currentScheme;
}

export function getIsDark(): boolean {
    return themeState.isDark;
}

export function getSourceColor(): string {
    return themeState.sourceColor;
}

export function getSchemeType(): SchemeType {
    return configState.theme.schemeType;
}

export function setSchemeType(schemeType: SchemeType): void {
    configState.theme.schemeType = schemeType;
    
    if (shouldUseM3Theme()) {
        themeState.currentTheme = generateM3Theme(themeState.sourceColor, schemeType);
        const scheme = readCurrentScheme();
        if (scheme) {
            applySchemeToCSS(scheme);
        }
    }
    
    updateThemeConfig(themeState.sourceColor, themeState.isDark);
}

export function initializeTheme(): void {
    themeState.sourceColor = configState.theme.sourceColor;
    themeState.isDark = configState.general.darkModeEnabled;
    
    const sourceColorRgb = removeAlphaFromHex(configState.theme.sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    
    if (sourceColorRgb !== defaultColorRgb) {
        themeState.currentTheme = generateM3Theme(configState.theme.sourceColor, configState.theme.schemeType);
        
        const scheme = readCurrentScheme();
        if (scheme) {
            applySchemeToCSS(scheme);
        }
    } else {
        themeState.currentTheme = null;
    }
}



if (browser) {
    themeState.sourceColor = configState.theme.sourceColor;
    themeState.isDark = configState.general.darkModeEnabled;
    const sourceColorRgb = removeAlphaFromHex(themeState.sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    if (sourceColorRgb !== defaultColorRgb) {
        themeState.currentTheme = generateM3Theme(themeState.sourceColor, configState.theme.schemeType);
        const scheme = readCurrentScheme();
        if (scheme) {
            applySchemeToCSS(scheme);
        }
    }
    try {
        document.documentElement.classList.toggle('dark', themeState.isDark);
    } catch { void 0; }

    if (configState.general.darkModeEnabled) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            setDarkMode(e.matches);
        });
    }
}
