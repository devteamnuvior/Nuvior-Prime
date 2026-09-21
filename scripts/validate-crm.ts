/**
 * validate:crm — connectivity + normalization checks without dumping PII.
 *
 * Uses fixtures/crm by default. Does not require live vendor credentials.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { validateCrmEnv, getCrmProviderConfig } from "@/lib/crmConfig";
import { parseSourceFile } from "@/providers/crm/import/parse";
import { dryMergeFromPartials } from "@/providers/crm/import/runImport";
import type { CrmSourceKind } from "@/providers/crm/import/types";
import { evaluateDnc } from "@/domain/crm/dnc";
import type { MatchResult } from "@/domain/crm/matching";
import { getCrmProvider } from "@/providers";
import { ApiCrmProvider } from "@/providers/crm/apiCrmProvider";

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const checks: Check[] = [];
  const dir = process.env.CRM_IMPORT_PATH || "fixtures/crm";

  const env = validateCrmEnv();
  checks.push({
    name: "env_config",
    ok: env.ok,
    detail: env.ok
      ? `mode=${getCrmProviderConfig().mode}; warnings=${env.warnings.length}`
      : env.errors.join("; "),
  });

  const sources: CrmSourceKind[] = ["accounts", "academy", "orders", "dnc", "visits"];
  const partials = [];
  let read = 0;

  for (const source of sources) {
    const path = join(dir, `${source}.json`);
    if (!existsSync(path)) continue;
    const parsed = parseSourceFile(source, readFileSync(path, "utf8"), "json");
    read += parsed.recordsRead;
    partials.push(...parsed.partials);
    checks.push({
      name: `parse_${source}`,
      ok: parsed.parseErrors.length === 0,
      detail: `read=${parsed.recordsRead} errors=${parsed.parseErrors.length}`,
    });
  }

  const merged = dryMergeFromPartials(partials);
  checks.push({
    name: "normalize_merge",
    ok: merged.accounts.length > 0,
    detail: `accounts=${merged.accounts.length} rejected=${merged.rejected.length} recordsRead=${read}`,
  });

  const withDnc = merged.accounts.find((a) => a.crmExternalId.includes("DNC"));
  const noDncRow = merged.accounts.find((a) => a.crmExternalId.includes("002"));
  const certified = merged.accounts.find((a) => a.aptosCertificationLevel);

  checks.push({
    name: "dnc_mapping",
    ok: Boolean(withDnc?.doNotContact && withDnc.dncVerified),
    detail: withDnc
      ? `DNC account verified=${withDnc.dncVerified} flag=${withDnc.doNotContact}`
      : "missing DNC fixture",
  });

  checks.push({
    name: "dnc_unverified_without_master",
    ok: Boolean(noDncRow && !noDncRow.dncVerified),
    detail: noDncRow
      ? `account without DNC row dncVerified=${noDncRow.dncVerified}`
      : "missing no-DNC fixture",
  });

  if (noDncRow) {
    const match: MatchResult = {
      state: "EXACT",
      method: "place_id",
      confidence: 1,
      candidates: [],
      crmAccount: noDncRow,
      reason: "test",
    };
    const d = evaluateDnc(match, noDncRow);
    checks.push({
      name: "dnc_fail_safe",
      ok: d.crmUnverified && !d.excluded,
      detail: d.debug,
    });
  }

  checks.push({
    name: "certification_mapping",
    ok: Boolean(
      certified &&
        certified.aptosPathway === "THREE_LEVEL" &&
        certified.aptosCertificationLevel,
    ),
    detail: certified
      ? `pathway=${certified.aptosPathway} level=${certified.aptosCertificationLevel}`
      : "missing cert fixture",
  });

  const meso = merged.accounts.find((a) => a.formerMesoesteticCustomer);
  checks.push({
    name: "former_meso_mapping",
    ok: Boolean(meso?.formerMesoesteticCustomer && meso.mesoesteticRetentionFlag),
    detail: meso
      ? `derived from orders productFamilies for ${mask(meso.crmExternalId)}`
      : "missing meso derivation fixture",
  });

  const ordered = merged.accounts.find((a) => a.lastOrderDate);
  checks.push({
    name: "last_order_mapping",
    ok: Boolean(ordered?.lastOrderDate),
    detail: ordered ? `lastOrderDate=${ordered.lastOrderDate}` : "missing order fixture",
  });

  // Provider mode: api must not return mock
  const prev = process.env.CRM_PROVIDER;
  process.env.CRM_PROVIDER = "api";
  const api = getCrmProvider();
  checks.push({
    name: "api_no_mock_fallback",
    ok: api.name === "api" && api.isUnavailable() && (await api.listAccounts()).length === 0,
    detail: `name=${api.name} unavailable=${api.isUnavailable()}`,
  });

  process.env.CRM_PROVIDER = "import";
  const imp = getCrmProvider();
  checks.push({
    name: "import_provider_selected",
    ok: imp.name === "import",
    detail: `name=${imp.name}`,
  });

  process.env.CRM_PROVIDER = "salesforce-invented";
  delete process.env.CRM_ALLOW_MOCK_FALLBACK;
  const bad = getCrmProvider();
  checks.push({
    name: "unknown_provider_fail_closed",
    ok: bad.name === "unavailable" && bad.isUnavailable(),
    detail: `name=${bad.name}`,
  });

  process.env.CRM_PROVIDER = prev;

  const secretLeak = JSON.stringify(checks).includes(process.env.CRM_API_TOKEN || "___none___");
  checks.push({
    name: "secret_non_exposure",
    ok: !process.env.CRM_API_TOKEN || !secretLeak,
    detail: "validation output does not echo CRM_API_TOKEN",
  });

  const apiStub = new ApiCrmProvider();
  checks.push({
    name: "api_boundary",
    ok: apiStub.isUnavailable(),
    detail: apiStub.getUnavailableReason().slice(0, 80),
  });

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function mask(id: string): string {
  return id.length <= 6 ? "***" : `${id.slice(0, 4)}…${id.slice(-2)}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
