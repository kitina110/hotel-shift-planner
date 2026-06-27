/**
 * Manual verification of coverage logic (Etapa 2).
 * Run: npx tsx scripts/verify-coverage.ts
 */
import {
  computeDayCoverage,
  timeRangesOverlap,
  validateNonOverlappingIntervals,
} from "../src/lib/coverage";
import { isQualifiedForZone } from "../src/lib/qualification";

const zoneId = "zone-servis";
const date = "2026-06-23";

const zones = [
  {
    id: zoneId,
    name: "Servis",
    intervals: [
      {
        id: "int-1",
        startTime: "13:00",
        endTime: "17:00",
        label: null,
        rules: [{ id: "r1", intervalId: "int-1", minGuests: 0, maxGuests: null, staffCount: 2 }],
      },
      {
        id: "int-2",
        startTime: "17:00",
        endTime: "22:00",
        label: null,
        rules: [{ id: "r2", intervalId: "int-2", minGuests: 0, maxGuests: null, staffCount: 3 }],
      },
    ],
  },
];

const shiftTypes = [
  { id: "s-long", zoneId, startTime: "13:00", endTime: "22:00" },
  { id: "s-short-am", zoneId, startTime: "13:00", endTime: "17:00" },
  { id: "s-short-pm", zoneId, startTime: "17:00", endTime: "22:00" },
];

const assignments = [
  { employeeId: "petr", employeeName: "Petr", shiftTypeId: "s-long", date },
  { employeeId: "jana", employeeName: "Jana", shiftTypeId: "s-short-am", date },
  { employeeId: "eva", employeeName: "Eva", shiftTypeId: "s-short-pm", date },
];

const snapshots = computeDayCoverage({
  date,
  guestCount: 80,
  zones,
  shiftTypes,
  assignments,
});

console.log("=== Overlap validation ===");
console.log(
  "13–17 vs 17–22 (touching):",
  timeRangesOverlap({ startTime: "13:00", endTime: "17:00" }, { startTime: "17:00", endTime: "22:00" }),
);
console.log(
  "13–17 vs 15–19 (overlap):",
  timeRangesOverlap({ startTime: "13:00", endTime: "17:00" }, { startTime: "15:00", endTime: "19:00" }),
);
console.log(
  "validate non-overlap OK:",
  validateNonOverlappingIntervals([
    { startTime: "13:00", endTime: "17:00" },
    { startTime: "17:00", endTime: "22:00" },
  ]),
);
console.log(
  "validate overlap error:",
  validateNonOverlappingIntervals([
    { startTime: "13:00", endTime: "17:00" },
    { startTime: "15:00", endTime: "19:00" },
  ]),
);

console.log("\n=== Coverage (Petr/Jana/Eva example) ===");
for (const s of snapshots) {
  const names = s.coveringStaff.map((c) => c.displayName).join(", ");
  console.log(
    `${s.target.startTime}–${s.target.endTime}: need=${s.target.requiredHeadcount} covered=${s.coveredHeadcount} deficit=${s.deficit} [${names}] ${s.fulfilled ? "✔" : "❌"}`,
  );
}

console.log("\n=== Qualification ===");
const employee = { id: "e1", qualifications: [{ shiftTypeId: "s-long" }] };
console.log("Qualified for Servis:", isQualifiedForZone(employee, zoneId, shiftTypes));

const expected = snapshots.map((s) => s.deficit);
const ok =
  expected[0] === 0 &&
  expected[1] === 1 &&
  snapshots[0]!.coveringStaff.length === 2 &&
  snapshots[1]!.coveringStaff.length === 2;

console.log(ok ? "\n✔ All checks passed" : "\n❌ Check failed");
process.exit(ok ? 0 : 1);
