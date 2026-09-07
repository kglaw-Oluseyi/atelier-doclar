export const WCAG_CONTRAST = {
  nonTextUi: 3,
  textNormal: 4.5,
  textLarge: 3,
} as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function expandHex(hex: string): string {
  const value = hex.slice(1);
  if (value.length === 3) {
    return `#${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`;
  }
  return hex;
}

function srgbChannelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  if (!HEX.test(hex)) {
    throw new Error(`contrast requires a hex colour, received ${hex}`);
  }
  const value = expandHex(hex).slice(1);
  const red = srgbChannelToLinear(Number.parseInt(value.slice(0, 2), 16));
  const green = srgbChannelToLinear(Number.parseInt(value.slice(2, 4), 16));
  const blue = srgbChannelToLinear(Number.parseInt(value.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hexChannels(hex: string): { r: number; g: number; b: number } {
  if (!HEX.test(hex)) {
    throw new Error(`contrast requires a hex colour, received ${hex}`);
  }
  const value = expandHex(hex).slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
