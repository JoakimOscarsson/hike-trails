const overviewBackground = "#f7f4ed";
const minimumBackgroundContrast = 3;
const colorAttemptLimit = 720;
const goldenAngle = 137.50776405;
const saturationSteps = [64, 72, 58, 80, 68, 76];
const lightnessSteps = [34, 30, 39, 27, 43, 36];
const minimumDistanceSteps = [92, 76, 60, 0];

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hslToRgb(hue: number, saturation: number, lightness: number): RgbColor {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360;
  const normalizedSaturation = Math.max(0, Math.min(1, saturation / 100));
  const normalizedLightness = Math.max(0, Math.min(1, lightness / 100));

  if (normalizedSaturation === 0) {
    const channel = clampChannel(normalizedLightness * 255);
    return { r: channel, g: channel, b: channel };
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q =
    normalizedLightness < 0.5
      ? normalizedLightness * (1 + normalizedSaturation)
      : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation;
  const p = 2 * normalizedLightness - q;

  return {
    r: clampChannel(hueToRgb(p, q, normalizedHue + 1 / 3) * 255),
    g: clampChannel(hueToRgb(p, q, normalizedHue) * 255),
    b: clampChannel(hueToRgb(p, q, normalizedHue - 1 / 3) * 255)
  };
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(color: RgbColor) {
  return `#${[color.r, color.g, color.b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(color: RgbColor) {
  const transform = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(color.r) + 0.7152 * transform(color.g) + 0.0722 * transform(color.b);
}

function contrastRatio(color: RgbColor, background: RgbColor) {
  const foregroundLuminance = relativeLuminance(color);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function colorDistance(left: RgbColor, right: RgbColor) {
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function candidateColor(id: string, attempt: number) {
  const hash = hashString(`${id}:${attempt}`);
  const hue = (hash % 360 + attempt * goldenAngle) % 360;
  const saturation = saturationSteps[(hash + attempt) % saturationSteps.length];
  let lightness = lightnessSteps[((hash >>> 8) + attempt) % lightnessSteps.length];
  let color = hslToRgb(hue, saturation, lightness);
  const background = hexToRgb(overviewBackground);

  while (contrastRatio(color, background) < minimumBackgroundContrast && lightness > 18) {
    lightness -= 3;
    color = hslToRgb(hue, saturation, lightness);
  }

  return color;
}

function pickOverviewColor(id: string, usedColors: RgbColor[]) {
  for (const minimumDistance of minimumDistanceSteps) {
    for (let attempt = 0; attempt < colorAttemptLimit; attempt += 1) {
      const color = candidateColor(id, attempt);
      const hex = rgbToHex(color);
      const isDuplicate = usedColors.some((usedColor) => rgbToHex(usedColor) === hex);
      const isSeparated = usedColors.every((usedColor) => colorDistance(color, usedColor) >= minimumDistance);
      if (!isDuplicate && isSeparated) return { color, hex };
    }
  }

  const fallback = candidateColor(`${id}:fallback`, 0);
  return { color: fallback, hex: rgbToHex(fallback) };
}

export function buildOverviewColorMap(ids: string[]) {
  const colorMap = new Map<string, string>();
  const usedColors: RgbColor[] = [];

  for (const id of ids) {
    if (!id || colorMap.has(id)) continue;
    const { color, hex } = pickOverviewColor(id, usedColors);
    colorMap.set(id, hex);
    usedColors.push(color);
  }

  return colorMap;
}

export function fallbackOverviewColor(id: string) {
  return rgbToHex(candidateColor(id, 0));
}
