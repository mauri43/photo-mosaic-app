import type { LabColor } from '../types/index.js';
export declare function rgbToLab(r: number, g: number, b: number): LabColor;
export declare function labToRgb(L: number, a: number, b: number): {
    r: number;
    g: number;
    b: number;
};
export declare function deltaE2000(lab1: LabColor, lab2: LabColor): number;
export declare function blendLabColors(color1: LabColor, color2: LabColor, ratio: number): LabColor;
//# sourceMappingURL=colorUtils.d.ts.map