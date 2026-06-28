export {
  availabilityStatusEmoji,
  defaultTemplateRowsFromLegacy,
  formatAvailabilityStatus,
  isHardAvailabilityBlock,
  isSchedulerSoftPenalty,
  legacyAvailabilityToStatus,
  legacyWeekFromDefaultTemplate,
  normalizeLegacyWeek,
  statusToLegacyAvailability,
  WEEK_DAY_COUNT,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";

export {
  defaultTemplateByDayOfWeek,
  sortDefaultTemplateDays,
  usesDefaultAvailabilityTemplate,
  type DefaultTemplateDay,
} from "@/lib/availability/default-template";

export {
  defaultTemplateCreateInputFromLegacy,
  legacyAvailabilityCreateInput,
  syncDefaultTemplateFromLegacy,
  upsertLegacyAvailabilityWeek,
  writeLegacyAvailabilityWithDualSync,
} from "@/lib/availability/legacy-sync";

export {
  mapDefaultTemplateToSchedulerAvailability,
  mapLegacyRowsToSchedulerAvailability,
  mapWeeklyStatusToSchedulerAvailability,
  resolveSchedulerAvailabilityInput,
  type SchedulerAvailabilityByDay,
  type SchedulerLegacyAvailability,
} from "@/lib/availability/scheduler-bridge";
