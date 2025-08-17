import type { M3Theme, ColorScheme } from './types';
import { generateM3Theme } from './generator';
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
}

export function setThemeFromSourceColor(sourceColor: string): void {
    configState.theme.sourceColor = sourceColor;
    themeState.sourceColor = sourceColor;
    
    const sourceColorRgb = removeAlphaFromHex(sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    
    if (sourceColorRgb !== defaultColorRgb) {
        themeState.currentTheme = generateM3Theme(sourceColor);
        if (currentScheme) {
            applySchemeToCSS(currentScheme);
        }
    } else {
        themeState.currentTheme = null;
        if (browser) {
            const root = document.documentElement;
            const m3Props = Array.from(root.style).filter(prop => prop.startsWith('--m3-scheme-'));
            m3Props.forEach(prop => root.style.removeProperty(prop));
        }
    }
    
    updateThemeConfig(sourceColor, themeState.isDark);
}

export function setDarkMode(isDark: boolean): void {
    configState.general.darkModeEnabled = isDark;
    configState.theme.isDarkMode = isDark;
    themeState.isDark = isDark;
    
    if (shouldUseM3Theme() && currentScheme) {
        applySchemeToCSS(currentScheme);
    }
    
    updateThemeConfig(themeState.sourceColor, isDark);
}

export function setCustomTheme(theme: M3Theme): void {
    themeState.currentTheme = theme;
    
    if (currentScheme) {
        applySchemeToCSS(currentScheme);
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

export function initializeTheme(): void {
    themeState.sourceColor = configState.theme.sourceColor;
    themeState.isDark = configState.general.darkModeEnabled;
    
    const sourceColorRgb = removeAlphaFromHex(configState.theme.sourceColor);
    const defaultColorRgb = removeAlphaFromHex(DEFAULT_SOURCE_COLOR);
    
    if (sourceColorRgb !== defaultColorRgb) {
        themeState.currentTheme = generateM3Theme(configState.theme.sourceColor);
        
        if (currentScheme) {
            applySchemeToCSS(currentScheme);
        }
    } else {
        themeState.currentTheme = null;
    }
}



if (browser) {
    if (configState.general.darkModeEnabled) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            setDarkMode(e.matches);
        });
    }
}
