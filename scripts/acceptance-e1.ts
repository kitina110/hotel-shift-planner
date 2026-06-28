/**
 * E1 acceptance — runtime smoke test for API routes.
 * Usage: npx tsx scripts/acceptance-e1.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3456";

const ROUTES = [
  "/api/employees",
  "/api/shift-types",
  "/api/coverage-zones",
  "/api/staffing-rules",
  "/api/history",
  "/api/schedules?week=" + encodeURIComponent(new Date().toISOString()),
];

async function main() {
  const failures: string[] = [];

  for (const path of ROUTES) {
    const url = `${BASE}${path}`;
    try {
      const res = await fetch(url);
      if (res.status >= 500) {
        failures.push(`${path} → HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        failures.push(`${path} → HTTP ${res.status}`);
        continue;
      }
      await res.json();
      console.log(`OK ${path} (${res.status})`);
    } catch (err) {
      failures.push(`${path} → ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Legacy availability write path (PUT uses Availability table)
  const employeesRes = await fetch(`${BASE}/api/employees`);
  const employees = (await employeesRes.json()) as Array<{
    id: string;
    availabilities: Array<{ dayOfWeek: number; available: boolean; preferredOff: boolean }>;
  }>;
  if (employees.length === 0) {
    failures.push("No employees to test PUT availability");
  } else {
    const emp = employees[0];
    const availability = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const existing = emp.availabilities.find((a) => a.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        available: existing?.available ?? true,
        preferredOff: existing?.preferredOff ?? false,
      };
    });
    availability[0] = { ...availability[0], preferredOff: !availability[0].preferredOff };

    const putRes = await fetch(`${BASE}/api/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });
    if (putRes.status >= 500) {
      failures.push(`PUT /api/employees/[id] availability → HTTP ${putRes.status}`);
    } else if (!putRes.ok) {
      failures.push(`PUT /api/employees/[id] availability → HTTP ${putRes.status}`);
    } else {
      console.log(`OK PUT /api/employees/${emp.id} availability (${putRes.status})`);
      // revert
      availability[0] = { ...availability[0], preferredOff: !availability[0].preferredOff };
      await fetch(`${BASE}/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability }),
      });
    }
  }

  // POST schedules (generate) smoke
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const genRes = await fetch(`${BASE}/api/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      weekStart: weekStart.toISOString(),
      guestForecasts: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { date: d.toISOString(), guestCount: 80 };
      }),
    }),
  });
  if (genRes.status >= 500) {
    failures.push(`POST /api/schedules → HTTP ${genRes.status}`);
  } else if (!genRes.ok) {
    const body = await genRes.text();
    failures.push(`POST /api/schedules → HTTP ${genRes.status}: ${body.slice(0, 200)}`);
  } else {
    console.log(`OK POST /api/schedules generate (${genRes.status})`);
  }

  if (failures.length > 0) {
    console.error("\nFAILURES:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log("\nAll API smoke checks passed.");
}

main();
