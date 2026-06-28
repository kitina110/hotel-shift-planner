-- CreateTable
CREATE TABLE "EmployeeDefaultAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT "EmployeeDefaultAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeWeeklyAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT "EmployeeWeeklyAvailability_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeWeeklyAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractHoursPerWeek" REAL NOT NULL,
    "isTemporaryHelp" BOOLEAN NOT NULL DEFAULT false,
    "useDefaultAvailabilityTemplate" BOOLEAN NOT NULL DEFAULT false,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Employee" ("contractHoursPerWeek", "createdAt", "id", "maxConsecutiveDays", "name", "updatedAt") SELECT "contractHoursPerWeek", "createdAt", "id", "maxConsecutiveDays", "name", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE INDEX "Employee_sortOrder_idx" ON "Employee"("sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDefaultAvailability_employeeId_dayOfWeek_key" ON "EmployeeDefaultAvailability"("employeeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "EmployeeWeeklyAvailability_scheduleId_date_idx" ON "EmployeeWeeklyAvailability"("scheduleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeWeeklyAvailability_scheduleId_employeeId_date_key" ON "EmployeeWeeklyAvailability"("scheduleId", "employeeId", "date");

-- ─── Employee 2.0 E1: data migration ───────────────────────────────────────────

-- sortOrder: highest contract hours first, then name
WITH "ordered" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "contractHoursPerWeek" DESC, "name" ASC) - 1 AS "rn"
    FROM "Employee"
)
UPDATE "Employee"
SET "sortOrder" = (
    SELECT "rn" FROM "ordered" WHERE "ordered"."id" = "Employee"."id"
);

-- Legacy Availability → default template
INSERT INTO "EmployeeDefaultAvailability" ("id", "employeeId", "dayOfWeek", "status")
SELECT
    'eda_' || "employeeId" || '_' || CAST("dayOfWeek" AS TEXT),
    "employeeId",
    "dayOfWeek",
    CASE
        WHEN "available" = 0 THEN 'UNAVAILABLE'
        WHEN "preferredOff" = 1 THEN 'PREFERRED_OFF'
        ELSE 'AVAILABLE'
    END
FROM "Availability";

-- Employees without legacy rows get full-week AVAILABLE template
INSERT INTO "EmployeeDefaultAvailability" ("id", "employeeId", "dayOfWeek", "status")
SELECT
    'eda_' || "e"."id" || '_' || CAST("d"."dayOfWeek" AS TEXT),
    "e"."id",
    "d"."dayOfWeek",
    'AVAILABLE'
FROM "Employee" AS "e"
CROSS JOIN (
    SELECT 0 AS "dayOfWeek" UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) AS "d"
WHERE NOT EXISTS (
    SELECT 1 FROM "Availability" AS "a" WHERE "a"."employeeId" = "e"."id"
);

-- Former global availability acted as a weekly template for all employees who had it
UPDATE "Employee"
SET "useDefaultAvailabilityTemplate" = 1
WHERE "id" IN (SELECT DISTINCT "employeeId" FROM "Availability");

-- Bootstrap weekly availability for existing schedules
INSERT INTO "EmployeeWeeklyAvailability" ("id", "scheduleId", "employeeId", "date", "status")
SELECT
    'ewa_' || "s"."id" || '_' || "e"."id" || '_' || CAST("d"."dayOfWeek" AS TEXT),
    "s"."id",
    "e"."id",
    datetime("s"."weekStart", '+' || "d"."dayOfWeek" || ' days'),
    CASE
        WHEN "e"."useDefaultAvailabilityTemplate" = 1 THEN COALESCE(
            (
                SELECT "da"."status"
                FROM "EmployeeDefaultAvailability" AS "da"
                WHERE "da"."employeeId" = "e"."id" AND "da"."dayOfWeek" = "d"."dayOfWeek"
            ),
            'AVAILABLE'
        )
        ELSE 'AVAILABLE'
    END
FROM "Schedule" AS "s"
CROSS JOIN "Employee" AS "e"
CROSS JOIN (
    SELECT 0 AS "dayOfWeek" UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) AS "d"
WHERE "e"."isActive" = 1;
