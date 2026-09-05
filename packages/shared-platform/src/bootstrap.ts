import {
  fixtureAssignments,
  fixtureClients,
  fixtureEvents,
  fixtureMasterEventFiles,
  fixtureMemberships,
  fixtureOrganisations,
  fixturePersons,
} from "./fixtures.js";
import { PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";

export function loadNonProductionFixtures(store: PlatformStore): PlatformService {
  const service = new PlatformService(store);
  service.seedCatalogue();
  const snap = store.snapshot();
  snap.organisations = fixtureOrganisations();
  snap.clients = fixtureClients();
  snap.events = fixtureEvents();
  snap.masterEventFiles = fixtureMasterEventFiles();
  snap.persons = fixturePersons();
  snap.memberships = fixtureMemberships();
  snap.assignments = fixtureAssignments();
  store.replace(snap);
  return service;
}
