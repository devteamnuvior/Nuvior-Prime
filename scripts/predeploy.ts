/**
 * Production pre-deploy step, run by `npm run build` before `next build`.
 *
 * Only acts on Vercel production builds (VERCEL_ENV=production), where the database
 * credentials are available; every other build (local, preview) returns immediately.
 *
 * For each release in RELEASES, in order, it:
 *   1. checks the database is the expected one and works out whether that release is
 *      already there (all of it: nothing to do; none of it: apply; some of it: stop),
 *   2. backs up every public table into a new `predeploy_backup_<timestamp>` schema in the
 *      same database and checks the row counts match (and logs the time and WAL position
 *      for a Neon point-in-time restore),
 *   3. applies the release's prisma/releases/*.sql in one transaction,
 *   4. verifies every expected object exists (and every retired one is gone) and existing
 *      row counts are unchanged.
 * Then it runs the XP backfill once (daily summaries, visit points, bonuses, badges) and
 * read-only smoke queries through the Prisma models the new pages use.
 *
 * Any failure exits non-zero, which fails the build so the current deployment stays live.
 * Logs carry only object names and counts, never row data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const BASELINE_TABLES = ["User", "Account", "VisitRecord", "VisitListRun", "AuditEvent"];

type Release = {
  name: string;
  file: string;
  /** Objects the release adds. Each one present counts as "done". */
  present: { tables?: string[]; enums?: string[]; columns?: [string, string][] };
  /** Objects the release removes. Each one gone counts as "done". */
  absent?: { tables?: string[]; columns?: [string, string][] };
};

// Expected objects describe the database after every release, so a release that a later one
// partly undoes (2026-11-02 created Challenge; 2026-11-05 drops it) does not list the undone object.
const RELEASES: Release[] = [
  {
    name: "2026-11-02 performance + live map",
    file: "prisma/releases/2026-11-02_performance_live_map.sql",
    present: {
      tables: ["SalesTarget", "RepDailySummary", "PointEvent", "UserBadge", "RepPosition", "ClinicWebProfile"],
      enums: ["VisitOutcome", "TargetPeriod", "TargetMetric", "PointReason"],
      columns: [
        ["VisitRecord", "fitScoreSnapshot"],
        ["VisitRecord", "outcomeCode"],
      ],
    },
  },
  {
    name: "2026-11-05 clinic slots, no challenges, no MANAGER role",
    file: "prisma/releases/2026-11-05_clinic_slots.sql",
    present: {
      columns: [
        ["VisitRecord", "durationMinutes"],
        ["RepDailySummary", "visitSlots"],
      ],
    },
    absent: {
      tables: ["Challenge"],
      columns: [
        ["PointEvent", "challengeId"],
        ["PointEvent", "multiplier"],
      ],
    },
  },
  {
    name: "2026-11-05 quality visits removed",
    file: "prisma/releases/2026-11-05_quality_visits_removed.sql",
    present: {},
    absent: {
      columns: [["RepDailySummary", "qualityVisits"]],
    },
  },
];

const log = (msg: string) => console.log(`[predeploy] ${msg}`);
const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

async function tablesIn(db: PrismaClient, schema: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ table_name: string }[]>`
    select table_name from information_schema.tables where table_schema = ${schema} and table_type = 'BASE TABLE' order by table_name`;
  return rows.map((r) => r.table_name);
}

async function enumsInPublic(db: PrismaClient): Promise<string[]> {
  const rows = await db.$queryRaw<{ typname: string }[]>`
    select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'`;
  return rows.map((r) => r.typname);
}

async function hasColumn(db: PrismaClient, table: string, column: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from information_schema.columns where table_schema = 'public' and table_name = ${table} and column_name = ${column}`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function rowCounts(db: PrismaClient, schema: string, tables: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const t of tables) {
    const rows = await db.$queryRawUnsafe<{ n: bigint }[]>(`select count(*)::bigint as n from ${q(schema)}.${q(t)}`);
    out.set(t, Number(rows[0]?.n ?? 0));
  }
  return out;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

async function releaseState(db: PrismaClient, release: Release): Promise<"applied" | "absent" | "partial"> {
  const tables = new Set(await tablesIn(db, "public"));
  const enums = new Set(await enumsInPublic(db));
  const checks = [
    ...(release.present.tables ?? []).map((t) => tables.has(t)),
    ...(release.present.enums ?? []).map((e) => enums.has(e)),
    ...(await Promise.all((release.present.columns ?? []).map(([t, c]) => hasColumn(db, t, c)))),
    ...(release.absent?.tables ?? []).map((t) => !tables.has(t)),
    ...(await Promise.all((release.absent?.columns ?? []).map(async ([t, c]) => !(await hasColumn(db, t, c))))),
  ];
  const done = checks.filter(Boolean).length;
  log(`${release.name}: ${done} of ${checks.length} objects in their released state`);
  return done === checks.length ? "applied" : done === 0 ? "absent" : "partial";
}

async function backup(db: PrismaClient, publicTables: string[]): Promise<Map<string, number>> {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  const backupSchema = `predeploy_backup_${stamp}`;
  const marker = await db.$queryRaw<{ at: Date }[]>`select now() as at`;
  log(`restore point (Neon PITR): ${marker[0]!.at.toISOString()}`);
  try {
    const lsn = await db.$queryRaw<{ lsn: string }[]>`select pg_current_wal_lsn()::text as lsn`;
    log(`restore point WAL LSN: ${lsn[0]!.lsn}`);
  } catch {
    log("WAL LSN not readable with this role; the timestamp above is the restore point");
  }
  const before = await rowCounts(db, "public", publicTables);
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`create schema ${q(backupSchema)}`);
      for (const t of publicTables) await tx.$executeRawUnsafe(`create table ${q(backupSchema)}.${q(t)} as table public.${q(t)}`);
    },
    { timeout: 600_000, maxWait: 60_000 },
  );
  const copied = await rowCounts(db, backupSchema, publicTables);
  const mismatched = publicTables.filter((t) => copied.get(t) !== before.get(t));
  if (mismatched.length) throw new Error(`Backup row counts differ for ${mismatched.join(", ")}`);
  const totalRows = [...before.values()].reduce((a, b) => a + b, 0);
  log(`backup ${backupSchema}: ${publicTables.length} tables, ${totalRows} rows, counts verified`);
  return before;
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    log(`skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
    return;
  }
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!url) throw new Error("No database URL in the build environment");
  const db = new PrismaClient({ datasourceUrl: url });

  try {
    // 1. Right database, and what state is it in?
    const publicTables = await tablesIn(db, "public");
    const missingBaseline = BASELINE_TABLES.filter((t) => !publicTables.includes(t));
    if (missingBaseline.length) throw new Error(`Baseline tables missing (${missingBaseline.join(", ")}); refusing to touch this database`);
    log(`connected; ${publicTables.length} tables in public`);

    let backedUp = false;
    for (const release of RELEASES) {
      const state = await releaseState(db, release);
      if (state === "partial") throw new Error(`${release.name} is partly present; stopping so nothing is guessed. Inspect the database before redeploying.`);
      if (state === "applied") {
        log(`${release.name}: already applied`);
        continue;
      }

      // 2. Backup, once per deploy, before the first release that has to run.
      const tablesNow = await tablesIn(db, "public");
      const before = backedUp ? await rowCounts(db, "public", tablesNow) : await backup(db, tablesNow);
      backedUp = true;

      // 3. Apply the release in one transaction.
      const statements = splitStatements(readFileSync(join(process.cwd(), release.file), "utf8"));
      await db.$transaction(
        async (tx) => {
          for (const s of statements) await tx.$executeRawUnsafe(s);
        },
        { timeout: 600_000, maxWait: 60_000 },
      );
      log(`${release.name}: applied ${statements.length} statements`);

      // 4. Verify. Tables the release drops are not expected to keep their row counts.
      if ((await releaseState(db, release)) !== "applied") throw new Error(`${release.name}: objects not in their released state after apply`);
      const kept = tablesNow.filter((t) => !(release.absent?.tables ?? []).includes(t));
      const after = await rowCounts(db, "public", kept);
      const changed = kept.filter((t) => after.get(t) !== before.get(t));
      log(changed.length ? `existing tables with new writes during deploy: ${changed.join(", ")}` : "existing row counts unchanged");
    }

    // 5. XP backfill, once: only while the ledger is still empty.
    const ledger = await db.pointEvent.count();
    const visits = await db.visitRecord.count({ where: { createdByUserId: { not: null }, accountId: { not: null } } });
    if (ledger === 0 && visits > 0) {
      log(`backfilling XP from ${visits} visits`);
      const { recomputeRepDailySummary } = await import("../src/lib/performance");
      const { awardDailyBonuses, awardPointsForVisit, syncBadges } = await import("../src/lib/xp");
      const { dayKey } = await import("../src/domain/performance");
      const rows = await db.visitRecord.findMany({
        where: { createdByUserId: { not: null }, accountId: { not: null } },
        orderBy: [{ visitDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, createdByUserId: true, visitDate: true },
      });
      const days = new Map<string, Set<string>>();
      for (const v of rows) {
        const set = days.get(v.createdByUserId!) ?? new Set<string>();
        set.add(dayKey(v.visitDate));
        days.set(v.createdByUserId!, set);
      }
      let summaries = 0;
      for (const [uid, set] of days) for (const d of set) if (await recomputeRepDailySummary(uid, d)) summaries += 1;
      let awards = 0;
      for (const v of rows) awards += await awardPointsForVisit(v.id);
      let bonuses = 0;
      for (const [uid, set] of days) for (const d of [...set].sort()) bonuses += await awardDailyBonuses(uid, d);
      let badges = 0;
      for (const uid of days.keys()) badges += (await syncBadges(uid)).length;
      log(`backfill: ${summaries} daily summaries, ${awards} visit awards, ${bonuses} daily bonuses, ${badges} badges for ${days.size} reps`);
    } else {
      log(`XP backfill not needed (ledger rows ${ledger}, visits ${visits})`);
    }

    // 6. Smoke queries through the models the new pages read.
    const smoke = {
      users: await db.user.count(),
      visitsWithOutcome: await db.visitRecord.count({ where: { outcomeCode: { not: null } } }),
      visitsSample: (await db.visitRecord.findMany({ take: 1, select: { id: true, outcomeCode: true, fitScoreSnapshot: true } })).length,
      targets: await db.salesTarget.count(),
      summaries: await db.repDailySummary.count(),
      xpByUser: (await db.pointEvent.groupBy({ by: ["userId"], _sum: { points: true } })).length,
      badges: await db.userBadge.count(),
      visitsExtended: await db.visitRecord.count({ where: { durationMinutes: { gt: 45 } } }),
      positions: await db.repPosition.count(),
      clinicWebProfiles: await db.clinicWebProfile.count(),
    };
    log(`smoke: ${Object.entries(smoke).map(([k, v]) => `${k}=${v}`).join(" ")}`);
    log("done");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(`[predeploy] FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
