import type { ColorScheme } from "./types";
import type { SchemeVibrant, SchemeTonalSpot } from "@ktibow/material-color-utilities-nightly";
import { redFromArgb, greenFromArgb, blueFromArgb, alphaFromArgb } from "@ktibow/material-color-utilities-nightly";

function argbToRgbString(argb: number): string {
    const r = redFromArgb(argb);
    const g = greenFromArgb(argb);
    const b = blueFromArgb(argb);
    return `${r} ${g} ${b}`;
}

export function hexToArgb(hex: string): number {
    const cleanHex = hex.replace('#', '');
    
    if (cleanHex.length === 6) {
        return parseInt('ff' + cleanHex, 16);
    } else if (cleanHex.length === 8) {
        const r = cleanHex.slice(0, 2);
        const g = cleanHex.slice(2, 4);
        const b = cleanHex.slice(4, 6);
        const a = cleanHex.slice(6, 8);
        return parseInt(a + r + g + b, 16);
    }
    
    return parseInt('ff000000', 16);
}

export function argbToHex(argb: number): string {
    const a = alphaFromArgb(argb).toString(16).padStart(2, '0');
    const r = redFromArgb(argb).toString(16).padStart(2, '0');
    const g = greenFromArgb(argb).toString(16).padStart(2, '0');
    const b = blueFromArgb(argb).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}${a}`;
}

export function getAlphaFromHex(hex: string): number {
    const cleanHex = hex.replace('#', '');
    
    if (cleanHex.length === 8) {
        const alphaHex = cleanHex.slice(6, 8);
        return parseInt(alphaHex, 16) / 255;
    }
    
    return 1;
}

export function removeAlphaFromHex(hex: string): string {
    const cleanHex = hex.replace('#', '');
    
    if (cleanHex.length === 8) {
        return `#${cleanHex.slice(0, 6)}`;
    }
    
    return hex;
}

export function convertToM3Theme(scheme: SchemeVibrant | SchemeTonalSpot): ColorScheme {
    return {
        primary: argbToRgbString(scheme.primary),
        surfaceTint: argbToRgbString(scheme.surfaceTint),
        onPrimary: argbToRgbString(scheme.onPrimary),
        primaryContainer: argbToRgbString(scheme.primaryContainer),
        onPrimaryContainer: argbToRgbString(scheme.onPrimaryContainer),
        secondary: argbToRgbString(scheme.secondary),
        onSecondary: argbToRgbString(scheme.onSecondary),
        secondaryContainer: argbToRgbString(scheme.secondaryContainer),
        onSecondaryContainer: argbToRgbString(scheme.onSecondaryContainer),
        tertiary: argbToRgbString(scheme.tertiary),
        onTertiary: argbToRgbString(scheme.onTertiary),
        tertiaryContainer: argbToRgbString(scheme.tertiaryContainer),
        onTertiaryContainer: argbToRgbString(scheme.onTertiaryContainer),
        error: argbToRgbString(scheme.error),
        onError: argbToRgbString(scheme.onError),
        errorContainer: argbToRgbString(scheme.errorContainer),
        onErrorContainer: argbToRgbString(scheme.onErrorContainer),
        background: argbToRgbString(scheme.background),
        onBackground: argbToRgbString(scheme.onBackground),
        surface: argbToRgbString(scheme.surface),
        onSurface: argbToRgbString(scheme.onSurface),
        surfaceVariant: argbToRgbString(scheme.surfaceVariant),
        onSurfaceVariant: argbToRgbString(scheme.onSurfaceVariant),
        outline: argbToRgbString(scheme.outline),
        outlineVariant: argbToRgbString(scheme.outlineVariant),
        shadow: argbToRgbString(scheme.shadow),
        scrim: argbToRgbString(scheme.scrim),
        inverseSurface: argbToRgbString(scheme.inverseSurface),
        inverseOnSurface: argbToRgbString(scheme.inverseOnSurface),
        inversePrimary: argbToRgbString(scheme.inversePrimary),
        primaryFixed: argbToRgbString(scheme.primaryFixed),
        onPrimaryFixed: argbToRgbString(scheme.onPrimaryFixed),
        primaryFixedDim: argbToRgbString(scheme.primaryFixedDim),
        onPrimaryFixedVariant: argbToRgbString(scheme.onPrimaryFixedVariant),
        secondaryFixed: argbToRgbString(scheme.secondaryFixed),
        onSecondaryFixed: argbToRgbString(scheme.onSecondaryFixed),
        secondaryFixedDim: argbToRgbString(scheme.secondaryFixedDim),
        onSecondaryFixedVariant: argbToRgbString(scheme.onSecondaryFixedVariant),
        tertiaryFixed: argbToRgbString(scheme.tertiaryFixed),
        onTertiaryFixed: argbToRgbString(scheme.onTertiaryFixed),
        tertiaryFixedDim: argbToRgbString(scheme.tertiaryFixedDim),
        onTertiaryFixedVariant: argbToRgbString(scheme.onTertiaryFixedVariant),
        surfaceDim: argbToRgbString(scheme.surfaceDim),
        surfaceBright: argbToRgbString(scheme.surfaceBright),
        surfaceContainerLowest: argbToRgbString(scheme.surfaceContainerLowest),
        surfaceContainerLow: argbToRgbString(scheme.surfaceContainerLow),
        surfaceContainer: argbToRgbString(scheme.surfaceContainer),
        surfaceContainerHigh: argbToRgbString(scheme.surfaceContainerHigh),
        surfaceContainerHighest: argbToRgbString(scheme.surfaceContainerHighest),
    };
}