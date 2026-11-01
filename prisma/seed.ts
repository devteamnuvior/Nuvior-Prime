import { PrismaClient, OrganizationType, PricePositioning, CertificationPathway, EvidenceSourceType, AppRole, UserStatus, TargetPeriod, TargetMetric } from "@prisma/client";
import { hash } from "bcryptjs";
import { TAXONOMY } from "../src/domain/taxonomy";
import { PRODUCTS, KEYWORD_BANK } from "../src/domain/products";
import { buildProvinceScopeRules } from "../src/domain/scopeOfPractice";
import { ORGANIZATION_TYPE_LABELS } from "../src/domain/terminology";
import { MOCK_PLACES } from "../src/providers/places/mockData";
import { MOCK_CRM_STATUSES } from "../src/providers/crm/mockCrmData";
import { classifyPlace } from "../src/domain/classifyPlace";

const prisma = new PrismaClient();

function orgEnum(code: string): OrganizationType {
  return code as OrganizationType;
}

function priceEnum(p: string): PricePositioning {
  switch (p) {
    case "value":
      return PricePositioning.VALUE;
    case "mid":
      return PricePositioning.MID;
    case "premium":
      return PricePositioning.PREMIUM;
    default:
      return PricePositioning.UNKNOWN;
  }
}

function pathwayEnum(p: string): CertificationPathway {
  switch (p) {
    case "THREE_LEVEL":
      return CertificationPathway.THREE_LEVEL;
    case "FOUR_LEVEL":
      return CertificationPathway.FOUR_LEVEL;
    default:
      return CertificationPathway.NONE;
  }
}

async function main() {
  // Clear reference + mock account data for idempotent seed
  await prisma.preVisitBrief.deleteMany();
  await prisma.repPosition.deleteMany();
  await prisma.repDailySummary.deleteMany();
  await prisma.salesTarget.deleteMany();
  await prisma.visitRecord.deleteMany();
  await prisma.visitListItem.deleteMany();
  await prisma.visitListRun.deleteMany();
  await prisma.crmAccountMapping.deleteMany();
  await prisma.accountAssignment.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.accountQualification.deleteMany();
  await prisma.fieldEvidence.deleteMany();
  await prisma.accountPerson.deleteMany();
  await prisma.accountPublicProfile.deleteMany();
  await prisma.accountInternalStatus.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.taxonomyCategory.deleteMany();
  await prisma.taxonomySegment.deleteMany();
  await prisma.productDefinition.deleteMany();
  await prisma.keywordBankEntry.deleteMany();
  await prisma.provinceScopeRule.deleteMany();

  for (const segment of TAXONOMY) {
    const created = await prisma.taxonomySegment.create({
      data: {
        number: segment.number,
        name: segment.name,
        subtitle: segment.subtitle,
        priorityNote: segment.priorityNote,
      },
    });
    for (const cat of segment.categories) {
      await prisma.taxonomyCategory.create({
        data: {
          segmentId: created.id,
          number: cat.number,
          label: cat.label,
        },
      });
    }
  }

  for (const product of PRODUCTS) {
    await prisma.productDefinition.create({ data: product });
  }

  for (const kw of KEYWORD_BANK) {
    await prisma.keywordBankEntry.create({ data: kw });
  }

  for (const rule of buildProvinceScopeRules()) {
    await prisma.provinceScopeRule.create({ data: rule });
  }

  for (const place of MOCK_PLACES) {
    const classification = classifyPlace(place);
    if (!classification.inTaxonomy) continue;
    const crm = MOCK_CRM_STATUSES.find((s) => s.placeId === place.placeId);

    const account = await prisma.account.create({
      data: {
        businessName: place.businessName,
        parentGroupName: null,
        organizationType: orgEnum(classification.organizationType),
        segmentNumber: classification.segmentNumber,
        categoryNumber: classification.categoryNumber,
        categoryLabel: classification.categoryLabel,
        streetAddress: place.streetAddress,
        unitSuite: place.unitSuite,
        city: place.city,
        provinceCode: place.provinceCode,
        postalCode: place.postalCode,
        googleMapsUrl: place.googleMapsUrl,
        placeId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
        dataCompleteness: "needs_verification",
        publicProfile: {
          create: {
            mainPhone: place.mainPhone,
            website: place.website,
            googleRating: place.googleRating,
            googleReviewCount: place.googleReviewCount,
            advertisesThreadLifting: crm?.advertisesThreadLifting ?? null,
            pricePositioning: priceEnum(crm?.pricePositioning ?? "unknown"),
            injectablesOffered: crm?.injectablesOffered ?? "UNKNOWN, verify",
            threadsOffered: crm?.threadsOffered ?? "UNKNOWN, verify",
            skincareLines: crm?.skincareLines ?? "UNKNOWN, verify",
            serviceMenuSummary: crm?.serviceMenuSummary ?? "UNKNOWN, verify",
            openingHoursJson: place.openingHoursJson ?? undefined,
          },
        },
        internalStatus: {
          create: {
            hasAcademyAccount: crm?.hasAcademyAccount ?? null,
            aptosCertificationLevel: crm?.aptosCertificationLevel ?? null,
            aptosPathway: pathwayEnum(crm?.aptosPathway ?? "NONE"),
            staffEligibleFor4Level: crm?.staffEligibleFor4Level ?? null,
            formerMesoesteticCustomer: crm?.formerMesoesteticCustomer ?? false,
            mesoesteticRetentionFlag: crm?.mesoesteticRetentionFlag ?? false,
            lastOrderDate: crm?.lastOrderDate ? new Date(crm.lastOrderDate) : null,
            doNotContact: crm?.doNotContact ?? false,
            crmExternalId: crm?.crmExternalId ?? null,
            assignedRep: crm?.assignedRep ?? null,
            internalAccountStatus: crm?.internalStatus ?? null,
            lastVisitDate: crm?.lastVisitDate ? new Date(crm.lastVisitDate) : null,
            nextRevisitDueDate: crm?.nextRevisitDueDate
              ? new Date(crm.nextRevisitDueDate)
              : null,
            visitNotes: crm?.visitNotes ?? null,
            historicalProductInterest: crm?.historicalProductInterest ?? null,
          },
        },
      },
    });

    if (crm?.practitioners.length) {
      for (const person of crm.practitioners) {
        await prisma.accountPerson.create({
          data: {
            accountId: account.id,
            name: person.name,
            credentials: person.credentials,
            role: person.role,
            performsInjectables: person.performsInjectables,
          },
        });
      }
    }

    await prisma.fieldEvidence.create({
      data: {
        accountId: account.id,
        fieldPath: "account.businessName",
        valueSnapshot: place.businessName,
        sourceType: EvidenceSourceType.MOCK,
        needsVerification: true,
      },
    });
    await prisma.fieldEvidence.create({
      data: {
        accountId: account.id,
        fieldPath: "account.streetAddress",
        valueSnapshot: place.streetAddress,
        sourceType: EvidenceSourceType.MOCK,
        needsVerification: true,
      },
    });
  }

  const counts = {
    segments: await prisma.taxonomySegment.count(),
    categories: await prisma.taxonomyCategory.count(),
    products: await prisma.productDefinition.count(),
    keywords: await prisma.keywordBankEntry.count(),
    scopeRules: await prisma.provinceScopeRule.count(),
    accounts: await prisma.account.count(),
    users: 0,
  };

  // Phase 6 — synthetic internal users (not real employees)
  const passwordHash = await hash("DevPass123!", 10);
  const seedUsers = [
    {
      email: "on.rep@nuvior.local",
      displayName: "Ontario Rep (Dev)",
      role: AppRole.REP,
      provinces: ["ON"],
    },
    {
      email: "ab.rep@nuvior.local",
      displayName: "Alberta Rep (Dev)",
      role: AppRole.REP,
      provinces: ["AB"],
    },
    // Four more Toronto reps so the admin live map has five people to watch (all ON clinics are in Toronto).
    { email: "to.rep.b@nuvior.local", displayName: "Toronto Rep B (Dev)", role: AppRole.REP, provinces: ["ON"] },
    { email: "to.rep.c@nuvior.local", displayName: "Toronto Rep C (Dev)", role: AppRole.REP, provinces: ["ON"] },
    { email: "to.rep.d@nuvior.local", displayName: "Toronto Rep D (Dev)", role: AppRole.REP, provinces: ["ON"] },
    { email: "to.rep.e@nuvior.local", displayName: "Toronto Rep E (Dev)", role: AppRole.REP, provinces: ["ON"] },
    {
      email: "on.manager@nuvior.local",
      displayName: "Ontario Manager (Dev)",
      role: AppRole.MANAGER,
      provinces: ["ON"],
    },
    {
      email: "admin@nuvior.local",
      displayName: "National Admin (Dev)",
      role: AppRole.ADMIN,
      provinces: ["*"],
    },
  ];

  for (const u of seedUsers) {
    await prisma.user.create({
      data: {
        ...u,
        status: UserStatus.ACTIVE,
        passwordHash,
        territories: u.provinces,
      },
    });
  }
  counts.users = await prisma.user.count();

  // Performance phase 1 — default targets for reps (set by the dev manager/admin).
  const admin = await prisma.user.findUnique({ where: { email: "admin@nuvior.local" } });
  const reps = await prisma.user.findMany({ where: { role: AppRole.REP } });
  const startsOn = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const defaultTargets: Array<{ period: TargetPeriod; metric: TargetMetric; value: number }> = [
    { period: TargetPeriod.DAY, metric: TargetMetric.VISITS, value: 7 },
    { period: TargetPeriod.DAY, metric: TargetMetric.QUALITY_VISITS, value: 4 },
    { period: TargetPeriod.WEEK, metric: TargetMetric.FOLLOW_UPS, value: 5 },
    { period: TargetPeriod.MONTH, metric: TargetMetric.NEW_ACCOUNTS, value: 4 },
    { period: TargetPeriod.MONTH, metric: TargetMetric.ACADEMY_SIGNUPS, value: 2 },
  ];
  for (const rep of reps) {
    for (const t of defaultTargets) {
      await prisma.salesTarget.create({
        data: { userId: rep.id, ...t, startsOn, createdById: admin?.id ?? null, note: "Seed default" },
      });
    }
  }
  const targetCount = await prisma.salesTarget.count();

  // Live map sample — the five Toronto reps: two checked in at clinics, three on the road
  // across the city. Alberta Rep gets no position and so stays off the live map (the sample is
  // Toronto only). `npm run live:simulate` moves the positioned reps around afterwards.
  const onClinics = await prisma.account.findMany({ where: { provinceCode: "ON" }, orderBy: { businessName: "asc" }, take: 2 });
  const atClinic = (email: string, clinic: (typeof onClinics)[number] | undefined, fallback: { lat: number; lng: number }) => ({
    email,
    lat: clinic?.latitude ?? fallback.lat,
    lng: clinic?.longitude ?? fallback.lng,
    accountId: clinic?.id ?? null,
    speedMps: 0,
    headingDeg: null as number | null,
  });
  const onRoad = (email: string, lat: number, lng: number, headingDeg: number) => ({ email, lat, lng, accountId: null, speedMps: 11.5, headingDeg: headingDeg as number | null });
  const seedPositions = [
    atClinic("on.rep@nuvior.local", onClinics[0], { lat: 43.6532, lng: -79.3832 }),
    atClinic("to.rep.b@nuvior.local", onClinics[1], { lat: 43.6472, lng: -79.4091 }),
    onRoad("to.rep.c@nuvior.local", 43.6708, -79.3868, 180), // Yonge & Bloor, heading south
    onRoad("to.rep.d@nuvior.local", 43.6383, -79.4197, 70), // Liberty Village, heading east
    onRoad("to.rep.e@nuvior.local", 43.6626, -79.3306, 250), // Leslieville, heading west
  ];
  for (const p of seedPositions) {
    const rep = reps.find((r) => r.email === p.email);
    if (!rep) continue;
    await prisma.repPosition.create({
      data: { userId: rep.id, lat: p.lat, lng: p.lng, accountId: p.accountId, speedMps: p.speedMps, headingDeg: p.headingDeg, accuracyM: 12, source: "seed", recordedAt: new Date() },
    });
  }
  const positionCount = await prisma.repPosition.count();

  console.log("Seed complete:", { ...counts, targets: targetCount, positions: positionCount });
  console.log(
    "Organization type labels (spec):",
    Object.values(ORGANIZATION_TYPE_LABELS).join(" / "),
  );
  console.log("Dev login password for all seed users: DevPass123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
