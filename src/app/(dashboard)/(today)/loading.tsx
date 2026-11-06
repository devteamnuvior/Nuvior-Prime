import { TodayRouteSkeleton } from "@/components/today/TodayRouteSkeleton";

/** Today's Route only — the other dashboard pages keep the generic table skeleton. */
export default function Loading() {
  return <TodayRouteSkeleton />;
}
