"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgbToLab = rgbToLab;
exports.labToRgb = labToRgb;
exports.deltaE2000 = deltaE2000;
exports.blendLabColors = blendLabColors;
// Convert RGB to XYZ color space
function rgbToXyz(r, g, b) {
    // Normalize RGB values
    let rn = r / 255;
    let gn = g / 255;
    let bn = b / 255;
    // Apply gamma correction
    rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
    gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
    bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;
    rn *= 100;
    gn *= 100;
    bn *= 100;
    // Convert to XYZ using sRGB matrix
    return {
        x: rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375,
        y: rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750,
        z: rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041
    };
}
// Convert XYZ to LAB color space
function xyzToLab(x, y, z) {
    // D65 illuminant reference values
    const refX = 95.047;
    const refY = 100.000;
    const refZ = 108.883;
    let xn = x / refX;
    let yn = y / refY;
    let zn = z / refZ;
    const epsilon = 0.008856;
    const kappa = 903.3;
    xn = xn > epsilon ? Math.pow(xn, 1 / 3) : (kappa * xn + 16) / 116;
    yn = yn > epsilon ? Math.pow(yn, 1 / 3) : (kappa * yn + 16) / 116;
    zn = zn > epsilon ? Math.pow(zn, 1 / 3) : (kappa * zn + 16) / 116;
    return {
        L: 116 * yn - 16,
        a: 500 * (xn - yn),
        b: 200 * (yn - zn)
    };
}
// Convert RGB to LAB
function rgbToLab(r, g, b) {
    const xyz = rgbToXyz(r, g, b);
    return xyzToLab(xyz.x, xyz.y, xyz.z);
}
// Convert LAB to XYZ
function labToXyz(L, a, b) {
    const refX = 95.047;
    const refY = 100.000;
    const refZ = 108.883;
    let yn = (L + 16) / 116;
    let xn = a / 500 + yn;
    let zn = yn - b / 200;
    const epsilon = 0.008856;
    const kappa = 903.3;
    const x3 = Math.pow(xn, 3);
    const z3 = Math.pow(zn, 3);
    xn = x3 > epsilon ? x3 : (116 * xn - 16) / kappa;
    yn = L > kappa * epsilon ? Math.pow((L + 16) / 116, 3) : L / kappa;
    zn = z3 > epsilon ? z3 : (116 * zn - 16) / kappa;
    return {
        x: xn * refX,
        y: yn * refY,
        z: zn * refZ
    };
}
// Convert XYZ to RGB
function xyzToRgb(x, y, z) {
    x /= 100;
    y /= 100;
    z /= 100;
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
    return {
        r: Math.max(0, Math.min(255, Math.round(r * 255))),
        g: Math.max(0, Math.min(255, Math.round(g * 255))),
        b: Math.max(0, Math.min(255, Math.round(b * 255)))
    };
}
// Convert LAB to RGB
function labToRgb(L, a, b) {
    const xyz = labToXyz(L, a, b);
    return xyzToRgb(xyz.x, xyz.y, xyz.z);
}
// Delta E 2000 - perceptually uniform color difference
function deltaE2000(lab1, lab2) {
    const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
    const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;
    const kL = 1, kC = 1, kH = 1;
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cab = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));
    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);
    let h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
    if (h1p < 0)
        h1p += 360;
    let h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
    if (h2p < 0)
        h2p += 360;
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp;
    if (C1p * C2p === 0) {
        dhp = 0;
    }
    else if (Math.abs(h2p - h1p) <= 180) {
        dhp = h2p - h1p;
    }
    else if (h2p - h1p > 180) {
        dhp = h2p - h1p - 360;
    }
    else {
        dhp = h2p - h1p + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;
    let Hp;
    if (C1p * C2p === 0) {
        Hp = h1p + h2p;
    }
    else if (Math.abs(h1p - h2p) <= 180) {
        Hp = (h1p + h2p) / 2;
    }
    else if (h1p + h2p < 360) {
        Hp = (h1p + h2p + 360) / 2;
    }
    else {
        Hp = (h1p + h2p - 360) / 2;
    }
    const T = 1 - 0.17 * Math.cos((Hp - 30) * Math.PI / 180)
        + 0.24 * Math.cos(2 * Hp * Math.PI / 180)
        + 0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180)
        - 0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180);
    const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
    const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;
    const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;
    const dE = Math.sqrt(Math.pow(dLp / (kL * SL), 2) +
        Math.pow(dCp / (kC * SC), 2) +
        Math.pow(dHp / (kH * SH), 2) +
        RT * (dCp / (kC * SC)) * (dHp / (kH * SH)));
    return dE;
}
// Blend two LAB colors with a given ratio (0-1)
function blendLabColors(color1, color2, ratio) {
    return {
        L: color1.L + (color2.L - color1.L) * ratio,
        a: color1.a + (color2.a - color1.a) * ratio,
        b: color1.b + (color2.b - color1.b) * ratio
    };
}
//# sourceMappingURL=colorUtils.js.map