import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { operationalStateFromCode } from "../../../server/operational-state";

export default function AcademyLoading() {
  return <AtelierOperationalState state={operationalStateFromCode("LOADING")} />;
}
