import { seatingVerifyAsAllowed } from "@maison-doclar/shared-platform";
import { fixturesAllowed, productionAuthorised } from "./config";

export function eventOsVerifyAsFlag(): boolean {
  return process.env.EVENT_OS_VERIFY_AS === "1";
}

export function eventOsVerifyAsAvailable(): boolean {
  return seatingVerifyAsAllowed({
    productionAuthorised: productionAuthorised(),
    fixturesAllowed: fixturesAllowed(),
    flag: eventOsVerifyAsFlag(),
  });
}
