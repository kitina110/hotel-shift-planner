-- CreateTable
CREATE TABLE "ShiftType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contractHoursPerWeek" REAL NOT NULL,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeQualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    CONSTRAINT "EmployeeQualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeQualification_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "preferredOff" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Availability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftTypeId" TEXT NOT NULL,
    "minGuests" INTEGER NOT NULL,
    "maxGuests" INTEGER,
    "staffCount" INTEGER NOT NULL,
    CONSTRAINT "StaffingRule_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuestForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "guestCount" INTEGER NOT NULL,
    CONSTRAINT "GuestForecast_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    CONSTRAINT "ScheduleAssignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScheduleAssignment_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeQualification_employeeId_shiftTypeId_key" ON "EmployeeQualification"("employeeId", "shiftTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_employeeId_dayOfWeek_key" ON "Availability"("employeeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StaffingRule_shiftTypeId_minGuests_idx" ON "StaffingRule"("shiftTypeId", "minGuests");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_weekStart_key" ON "Schedule"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "GuestForecast_scheduleId_date_key" ON "GuestForecast"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_scheduleId_date_idx" ON "ScheduleAssignment"("scheduleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleAssignment_scheduleId_employeeId_date_key" ON "ScheduleAssignment"("scheduleId", "employeeId", "date");
