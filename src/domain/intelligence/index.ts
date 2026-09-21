export type {
  ClinicIntelligenceDto,
  ClinicResearchUiState,
  OfferingItem,
  OpportunityGapItem,
  EvidenceItem,
  PrimaryOpportunityView,
  SecondaryOpportunityView,
  ClinicIntelligenceDiagnostics,
  BriefIntelligenceSections,
} from "./clinicIntelligenceDto";

export {
  inventoryStateLabel,
  capabilityLabel,
  opportunityHeadline,
  secondaryOpportunityHeadline,
} from "./labels";

export {
  buildClinicIntelligenceDto,
  buildOfferings,
  buildBriefIntelligenceSections,
  emptyClinicIntelligenceDto,
  primaryGapFromOpportunity,
  INTELLIGENCE_VERSION_MARKERS,
} from "./buildClinicIntelligenceDto";

export {
  runClinicIntelligencePipeline,
  getCachedClinicIntelligence,
  type ClinicIntelligenceInput,
  type ClinicIntelligenceResult,
} from "./runClinicIntelligence";

export {
  applyIntelligenceToBrief,
  intelligenceSectionsFromDto,
} from "./applyIntelligenceToBrief";
