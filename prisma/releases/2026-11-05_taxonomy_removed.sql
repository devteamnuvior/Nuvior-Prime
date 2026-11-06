-- Release 2026-11-05 (6): the clinic taxonomy (segment / category / organization type) and the lead product are removed —
-- TaxonomySegment, TaxonomyCategory, Account.organizationType/segmentNumber/categoryNumber/categoryLabel,
-- AccountQualification.recommendedLeadProduct, VisitListItem.leadProduct, ProductDefinition.mayRecommendAsLead and the OrganizationType / LeadProduct enums.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-05_check_in.sql, in one transaction.
-- Data moves: none needed; the columns, tables and enums are simply dropped.

ALTER TABLE "Account" DROP COLUMN IF EXISTS "organizationType";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "segmentNumber";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "categoryNumber";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "categoryLabel";
ALTER TABLE "AccountQualification" DROP COLUMN IF EXISTS "recommendedLeadProduct";
ALTER TABLE "VisitListItem" DROP COLUMN IF EXISTS "leadProduct";
ALTER TABLE "ProductDefinition" DROP COLUMN IF EXISTS "mayRecommendAsLead";
DROP TABLE IF EXISTS "TaxonomyCategory";
DROP TABLE IF EXISTS "TaxonomySegment";
DROP TYPE IF EXISTS "OrganizationType";
DROP TYPE IF EXISTS "LeadProduct";
