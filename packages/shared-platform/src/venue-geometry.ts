import { createHash } from "node:crypto";
import { PlatformError } from "./errors.js";

export const CANONICAL_LENGTH_UNIT = "MILLIMETRE" as const;
export const ROTATION_UNIT = "MILLIDEGREE" as const;
export const COORDINATE_ORIGIN = "TOP_LEFT" as const;
export const AXIS_X = "RIGHT" as const;
export const AXIS_Y = "DOWN" as const;
export const RECTANGLE_CONVENTION = "TOP_LEFT_ORIGIN_WIDTH_HEIGHT" as const;
export const ELLIPSE_CONVENTION = "CENTER_RADII" as const;
export const MAX_MILLIMETRE = 100_000_000;
export const MAX_MILLIDEGREE = 359_999;
export const DISPLAY_LENGTH_UNITS = ["METRE", "FOOT"] as const;
export type DisplayLengthUnit = (typeof DISPLAY_LENGTH_UNITS)[number];

export const FROZEN_COORDINATE_SYSTEM = {
  origin: COORDINATE_ORIGIN,
  axisX: AXIS_X,
  axisY: AXIS_Y,
  rectangleConvention: RECTANGLE_CONVENTION,
  ellipseConvention: ELLIPSE_CONVENTION,
  rotationUnit: ROTATION_UNIT,
  canonicalLengthUnit: CANONICAL_LENGTH_UNIT,
} as const;

export type FrozenCoordinateSystem = typeof FROZEN_COORDINATE_SYSTEM;

export type LayoutBounds = {
  minXMm: number;
  minYMm: number;
  maxXMm: number;
  maxYMm: number;
  widthMm: number;
  heightMm: number;
};

const PROHIBITED_PIXEL_KEYS = ["px", "pixel", "pixels", "screenX", "screenY", "clientX", "clientY", "pageX", "pageY"];

export function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value) && value >= 0;
}

export function assertMillimetre(value: unknown, field: string): number {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new PlatformError("VALIDATION_FAILED", `${field} must be a finite millimetre value`, {
      field,
      publicMessage: "Dimensions must be finite millimetres. Infinity and NaN are rejected.",
    });
  }
  if (!isFiniteNonNegativeInteger(value) || value > MAX_MILLIMETRE) {
    throw new PlatformError("VALIDATION_FAILED", `${field} must be a non-negative integer millimetre at most ${MAX_MILLIMETRE}`, {
      field,
      publicMessage: "Canonical dimensions are non-negative integer millimetres. Screen pixels are not stored.",
    });
  }
  return value;
}

export function assertMillidegree(value: unknown, field: string): number {
  if (!isFiniteNonNegativeInteger(value) || value > MAX_MILLIDEGREE) {
    throw new PlatformError("VALIDATION_FAILED", `${field} must be an integer millidegree in 0–${MAX_MILLIDEGREE}`, {
      field,
      publicMessage: "Rotation uses a normalised millidegree in the half-open range [0, 360000).",
    });
  }
  return value;
}

export function normalizeMillidegree(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new PlatformError("VALIDATION_FAILED", "rotation must be a finite integer millidegree");
  }
  const span = MAX_MILLIDEGREE + 1;
  return ((value % span) + span) % span;
}

export function layoutBoundsFromSize(widthMm: number, heightMm: number): LayoutBounds {
  const width = assertMillimetre(widthMm, "widthMm");
  const height = assertMillimetre(heightMm, "heightMm");
  if (width < 1 || height < 1) {
    throw new PlatformError("VALIDATION_FAILED", "a layout must have a positive width and height in millimetres", {
      publicMessage: "Blank layouts still need a positive floor size in millimetres.",
    });
  }
  return {
    minXMm: 0,
    minYMm: 0,
    maxXMm: width,
    maxYMm: height,
    widthMm: width,
    heightMm: height,
  };
}

export function assertNoPixelPersistence(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (PROHIBITED_PIXEL_KEYS.some((item) => lower === item.toLowerCase() || lower.includes(item))) {
      throw new PlatformError("VALIDATION_FAILED", "screen-pixel fields cannot be persisted on a layout", {
        field: key,
        publicMessage: "Viewport pixels are transient. Canonical geometry is stored in millimetres.",
      });
    }
  }
}

export function canonicalSerialize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new PlatformError("VALIDATION_FAILED", "canonical serialization rejects NaN and Infinity");
    }
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalSerialize(item)}`).join(",")}}`;
  }
  throw new PlatformError("VALIDATION_FAILED", "canonical serialization rejects unsupported values");
}

export function canonicalContentHash(value: unknown): string {
  return createHash("sha256").update(canonicalSerialize(value)).digest("hex");
}

export function layoutContentHash(input: {
  coordinateSystem: FrozenCoordinateSystem;
  bounds: LayoutBounds;
  objects: ReadonlyArray<{ id: string } & Record<string, unknown>>;
}): string {
  const objects = [...input.objects].sort((left, right) => left.id.localeCompare(right.id));
  return canonicalContentHash({
    coordinateSystem: input.coordinateSystem,
    bounds: input.bounds,
    objects,
  });
}
