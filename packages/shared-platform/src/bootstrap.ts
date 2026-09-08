import {
  fixtureAssignments,
  fixtureClients,
  fixtureEvents,
  fixtureMasterEventFiles,
  fixtureMemberships,
  fixtureOrganisations,
  fixturePersons,
} from "./fixtures.js";
import { applyEosS05AToSnapshot } from "./eec-migration.js";
import { PlatformService, type PlatformServiceOptions } from "./service.js";
import type { PlatformStore } from "./store.js";

export function loadNonProductionFixtures(store: PlatformStore, options: PlatformServiceOptions = {}): PlatformService {
  const service = new PlatformService(store, options);
  service.seedCatalogue();
  const snap = store.snapshot();
  snap.organisations = fixtureOrganisations();
  snap.clients = fixtureClients();
  snap.events = fixtureEvents();
  snap.masterEventFiles = fixtureMasterEventFiles();
  snap.persons = fixturePersons();
  snap.memberships = fixtureMemberships();
  snap.assignments = fixtureAssignments();
  store.replace(applyEosS05AToSnapshot(snap, "2026-09-08T22:00:00.000Z"));
  return service;
}
