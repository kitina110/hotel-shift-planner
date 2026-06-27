-- CreateTable
CREATE TABLE "OperationalZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoverageInterval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneId" TEXT NOT NULL,
    "label" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CoverageInterval_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "OperationalZone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoverageRequirementRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intervalId" TEXT NOT NULL,
    "minGuests" INTEGER NOT NULL,
    "maxGuests" INTEGER,
    "staffCount" INTEGER NOT NULL,
    CONSTRAINT "CoverageRequirementRule_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "CoverageInterval" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeZoneQualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    CONSTRAINT "EmployeeZoneQualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeZoneQualification_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "OperationalZone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuestForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "demandProfileId" TEXT,
    "notes" TEXT,
    CONSTRAINT "GuestForecast_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuestForecast_demandProfileId_fkey" FOREIGN KEY ("demandProfileId") REFERENCES "DemandProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GuestForecast" ("date", "guestCount", "id", "scheduleId") SELECT "date", "guestCount", "id", "scheduleId" FROM "GuestForecast";
DROP TABLE "GuestForecast";
ALTER TABLE "new_GuestForecast" RENAME TO "GuestForecast";
CREATE UNIQUE INDEX "GuestForecast_scheduleId_date_key" ON "GuestForecast"("scheduleId", "date");
CREATE TABLE "new_ShiftType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL DEFAULT '22:00',
    "zoneId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftType_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "OperationalZone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShiftType" ("breakMinutes", "createdAt", "durationMinutes", "endTime", "id", "name", "startTime", "updatedAt") SELECT "breakMinutes", "createdAt", "durationMinutes", "endTime", "id", "name", "startTime", "updatedAt" FROM "ShiftType";
DROP TABLE "ShiftType";
ALTER TABLE "new_ShiftType" RENAME TO "ShiftType";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OperationalZone_name_key" ON "OperationalZone"("name");

-- CreateIndex
CREATE INDEX "CoverageInterval_zoneId_sortOrder_idx" ON "CoverageInterval"("zoneId", "sortOrder");

-- CreateIndex
CREATE INDEX "CoverageRequirementRule_intervalId_minGuests_idx" ON "CoverageRequirementRule"("intervalId", "minGuests");

-- CreateIndex
CREATE UNIQUE INDEX "DemandProfile_name_key" ON "DemandProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeZoneQualification_employeeId_zoneId_key" ON "EmployeeZoneQualification"("employeeId", "zoneId");
