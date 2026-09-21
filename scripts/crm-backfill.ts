/**
 * CLI mapping backfill dry-run / apply.
 *   npm run crm:backfill -- --dry-run
 *   npm run crm:backfill -- --apply
 */

import { runMappingBackfill } from "@/domain/crm/backfillMappings";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = !apply;

  const report = await runMappingBackfill({ dryRun });
  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        applied: report.applied,
        proposals: report.proposals.map((p) => ({
          action: p.action,
          id: mask(p.crmExternalId),
          place: mask(p.placeId),
          detail: p.detail,
        })),
      },
      null,
      2,
    ),
  );
}

function mask(id: string): string {
  return id.length <= 6 ? "***" : `${id.slice(0, 4)}…${id.slice(-2)}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
