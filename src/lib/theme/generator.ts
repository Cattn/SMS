import { SchemeTonalSpot, Hct } from "@ktibow/material-color-utilities-nightly";
import { convertToM3Theme, hexToArgb, removeAlphaFromHex } from "./converter";
import type { M3Theme } from "./types";

export function generateM3Theme(sourceColor: string): M3Theme {
    // some hex codes MIGHT alpha, we need to remove it, this shouldn't be possible anymore
    // yet for some reason the color picker just does what it wants lol
    // also maybe in some weird cases with json imports
    const rgbOnlyHex = removeAlphaFromHex(sourceColor);
    
    const argb = hexToArgb(rgbOnlyHex);
    const hct = Hct.fromInt(argb);
    
    const lightScheme = new SchemeTonalSpot(hct, false, 0.0);
    const darkScheme = new SchemeTonalSpot(hct, true, 0.0);

    return {
        light: convertToM3Theme(lightScheme),
        dark: convertToM3Theme(darkScheme),
        font: "'Roboto Flex', sans-serif"
    };
}