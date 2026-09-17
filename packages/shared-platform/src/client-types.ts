/**
 * Type-only re-exports for Event OS client components.
 * Prefer `import type` from `@maison-doclar/shared-platform/client-types`.
 * Never import the shared-platform root barrel from `"use client"` modules.
 */
export type { EventVenueWorkspace, LayoutSetupWorkspace, VenueDetailWorkspace } from "./venue-projections.js";
export type { HostAtelierProjection } from "./atelier-projections.js";
export type { SpatialObject } from "./spatial-schemas.js";
export type { ProtectionFormState } from "./risk-form-contract.js";
