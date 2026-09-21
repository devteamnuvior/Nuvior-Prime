/**
 * CLI: import CRM source files into staging + canonical mirror.
 *
 * Usage:
 *   npm run crm:import -- --dir fixtures/crm --dry-run
 *   npm run crm:import -- --dir fixtures/crm
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { runCrmImport, type ImportFileInput } from "@/providers/crm/import/runImport";
import type { CrmSourceKind } from "@/providers/crm/import/types";
import { writeAuditEvent } from "@/lib/audit";

const SOURCES: CrmSourceKind[] = ["accounts", "academy", "orders", "dnc", "visits"];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dirIdx = args.indexOf("--dir");
  const dir =
    (dirIdx >= 0 ? args[dirIdx + 1] : null) ||
    process.env.CRM_IMPORT_PATH ||
    "fixtures/crm";

  if (!existsSync(dir)) {
    console.error(`Import directory not found: ${dir}`);
    process.exit(1);
  }

  const files: ImportFileInput[] = [];
  const entries = readdirSync(dir);

  for (const source of SOURCES) {
    const jsonName = `${source}.json`;
    const csvName = `${source}.csv`;
    if (entries.includes(jsonName)) {
      files.push({
        source,
        content: readFileSync(join(dir, jsonName), "utf8"),
        format: "json",
        fileName: jsonName,
      });
    } else if (entries.includes(csvName)) {
      files.push({
        source,
        content: readFileSync(join(dir, csvName), "utf8"),
        format: "csv",
        fileName: csvName,
      });
    }
  }

  if (files.length === 0) {
    console.error(`No accounts/academy/orders/dnc/visits files in ${dir}`);
    process.exit(1);
  }

  console.log(`CRM import (${dryRun ? "dry-run" : "apply"}) from ${dir}`);
  console.log(`Sources: ${files.map((f) => f.fileName).join(", ")}`);

  const report = await runCrmImport(files, { dryRun });

  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        recordsRead: report.recordsRead,
        validPartials: report.validPartials,
        invalidPartials: report.invalidPartials,
        newCanonicalCount: report.newCanonicalCount,
        updatedCanonicalCount: report.updatedCanonicalCount,
        parseErrorCount: report.parseErrors.length,
        accountsPreview: report.accountsPreview.map((a) => ({
          id: mask(a.crmExternalId),
          name: a.businessName.slice(0, 24),
          dncVerified: a.dncVerified,
        })),
        wrote: report.wrote,
        note: report.ambiguousNote,
      },
      null,
      2,
    ),
  );

  if (!dryRun) {
    await writeAuditEvent({
      actor: null,
      action: "crm.import.execute",
      resourceType: "CanonicalCrmAccount",
      metadata: {
        recordsRead: report.recordsRead,
        newCanonicalCount: report.newCanonicalCount,
        updatedCanonicalCount: report.updatedCanonicalCount,
        invalidPartials: report.invalidPartials,
        dir,
      },
    });
  }

  if (report.parseErrors.length > 10) {
    console.warn(`… ${report.parseErrors.length} parse errors (showing 10)`);
  }
  for (const e of report.parseErrors.slice(0, 10)) {
    console.warn(`parse error [${e.source}#${e.index}]: ${e.message}`);
  }

  process.exit(report.invalidPartials > 0 && report.validPartials === 0 ? 1 : 0);
}

function mask(id: string): string {
  if (id.length <= 6) return "***";
  return `${id.slice(0, 4)}…${id.slice(-2)}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
