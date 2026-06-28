export {
  availabilityStatusEmoji,
  defaultTemplateRowsFromLegacy,
  formatAvailabilityStatus,
  formatAvailabilityStatusWithEmoji,
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

export {
  coerceTemplateInput,
  defaultTemplateCreateInputFromStatus,
  defaultTemplateRowsFromEmployee,
  legacyDaysFromTemplateInput,
  writeDefaultTemplateWithLegacySync,
  type DefaultTemplateDayInput,
} from "@/lib/availability/default-template-sync";

export {
  AVAILABILITY_STATUSES,
  bootstrapWeeklyAvailabilityIfNeeded,
  copyWeeklyAvailabilityFromWeek,
  ensureWeeklyAvailabilityForSchedule,
  loadWeeklyAvailabilityByEmployee,
  loadWeeklyAvailabilityGrid,
  nextAvailabilityStatus,
  resetWeeklyAvailabilityFromTemplate,
  syncMissingWeeklyRowsForActiveEmployees,
  updateWeeklyAvailabilityStatus,
  weekDayKeys,
  type WeeklyAvailabilityCell,
  type WeeklyAvailabilityGrid,
  type WeeklyAvailabilityRow,
} from "@/lib/availability/weekly-availability";
