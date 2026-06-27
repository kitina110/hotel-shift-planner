/**
 * Verifies hybrid scheduler: legacy fallback + coverage-based planning.
 * Run: npx tsx scripts/verify-coverage-scheduler.ts
 */
import { startOfWeek } from "date-fns";
import {
  generateSchedule,
  partitionPlanning,
  type SchedulerInput,
} from "../src/lib/scheduler";

const weekStart = startOfWeek(new Date("2026-06-23"), { weekStartsOn: 1 });

function baseInput(): SchedulerInput {
  return {
    weekStart,
    shiftTypes: [
      {
        id: "s-long",
        name: "Servis 13–22",
        zoneId: "zone-servis",
        startTime: "13:00",
        endTime: "22:00",
        durationMinutes: 9 * 60,
      },
      {
        id: "s-am",
        name: "Servis 13–17",
        zoneId: "zone-servis",
        startTime: "13:00",
        endTime: "17:00",
        durationMinutes: 4 * 60,
      },
      {
        id: "s-pm",
        name: "Servis 17–22",
        zoneId: "zone-servis",
        startTime: "17:00",
        endTime: "22:00",
        durationMinutes: 5 * 60,
      },
      {
        id: "bar",
        name: "Bar",
        zoneId: "zone-bar",
        startTime: "17:00",
        endTime: "22:00",
        durationMinutes: 5 * 60,
      },
    ],
    employees: [
      {
        id: "petr",
        name: "Petr",
        contractHoursPerWeek: 40,
        maxConsecutiveDays: 6,
        qualifiedShiftTypeIds: ["s-long", "s-am", "s-pm", "bar"],
        availability: Object.fromEntries(
          Array.from({ length: 7 }, (_, dayOfWeek) => [
            dayOfWeek,
            { available: true, preferredOff: false },
          ]),
        ),
      },
      {
        id: "jana",
        name: "Jana",
        contractHoursPerWeek: 40,
        maxConsecutiveDays: 6,
        qualifiedShiftTypeIds: ["s-long", "s-am", "s-pm"],
        availability: Object.fromEntries(
          Array.from({ length: 7 }, (_, dayOfWeek) => [
            dayOfWeek,
            { available: true, preferredOff: false },
          ]),
        ),
      },
      {
        id: "eva",
        name: "Eva",
        contractHoursPerWeek: 40,
        maxConsecutiveDays: 6,
        qualifiedShiftTypeIds: ["s-long", "s-pm"],
        availability: Object.fromEntries(
          Array.from({ length: 7 }, (_, dayOfWeek) => [
            dayOfWeek,
            { available: true, preferredOff: false },
          ]),
        ),
      },
      {
        id: "tomas",
        name: "Tomáš",
        contractHoursPerWeek: 40,
        maxConsecutiveDays: 6,
        qualifiedShiftTypeIds: ["s-long", "s-pm", "bar"],
        availability: Object.fromEntries(
          Array.from({ length: 7 }, (_, dayOfWeek) => [
            dayOfWeek,
            { available: true, preferredOff: false },
          ]),
        ),
      },
    ],
    staffingRules: [
      { shiftTypeId: "bar", minGuests: 0, maxGuests: null, staffCount: 1 },
    ],
    guestForecasts: [
      { date: new Date("2026-06-23"), guestCount: 80 },
    ],
    historicalAssignments: [],
    coverageZones: [
      {
        id: "zone-servis",
        name: "Servis",
        intervals: [
          {
            id: "int-am",
            startTime: "13:00",
            endTime: "17:00",
            rules: [{ minGuests: 0, maxGuests: null, staffCount: 2 }],
          },
          {
            id: "int-pm",
            startTime: "17:00",
            endTime: "22:00",
            rules: [{ minGuests: 0, maxGuests: null, staffCount: 3 }],
          },
        ],
      },
      {
        id: "zone-bar",
        name: "Bar",
        intervals: [],
      },
    ],
  };
}

console.log("=== Legacy-only partition (Bar without intervals) ===");
const legacyPartition = partitionPlanning(baseInput());
console.log("legacy shift types:", legacyPartition.legacyShiftTypeIds);
console.log("coverage zones:", legacyPartition.readyZones.map((z) => z.name));

const legacyOnly = generateSchedule({
  ...baseInput(),
  coverageZones: [
    {
      id: "zone-servis",
      name: "Servis",
      intervals: [],
    },
    {
      id: "zone-bar",
      name: "Bar",
      intervals: [],
    },
  ],
  staffingRules: [
    { shiftTypeId: "s-long", minGuests: 0, maxGuests: null, staffCount: 2 },
    { shiftTypeId: "bar", minGuests: 0, maxGuests: null, staffCount: 1 },
  ],
});

console.log("legacy mode assignments:", legacyOnly.assignments.length);
console.log("legacy mode uses coverage:", legacyOnly.coverageZoneIds.length === 0);

console.log("\n=== Coverage mode (Servis with intervals) ===");
const coverageResult = generateSchedule(baseInput());
console.log("coverage zones used:", coverageResult.coverageZoneIds);
console.log("legacy shift types used:", coverageResult.legacyShiftTypeIds);
console.log("assignments:", coverageResult.assignments.length);
console.log("warnings:", coverageResult.warnings);

const mondayAssignments = coverageResult.assignments.filter(
  (a) => a.date.toISOString().slice(0, 10) === "2026-06-23",
);

const ok =
  legacyPartition.readyZones.length === 1 &&
  legacyPartition.legacyShiftTypeIds.includes("bar") &&
  legacyOnly.coverageZoneIds.length === 0 &&
  coverageResult.coverageZoneIds.includes("zone-servis") &&
  coverageResult.legacyShiftTypeIds.includes("bar") &&
  mondayAssignments.length >= 3;

console.log(ok ? "\n✔ Scheduler hybrid checks passed" : "\n❌ Scheduler checks failed");
process.exit(ok ? 0 : 1);
