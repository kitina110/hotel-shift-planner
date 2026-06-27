-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShiftType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL DEFAULT '22:00',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShiftType" ("breakMinutes", "createdAt", "durationMinutes", "id", "name", "startTime", "updatedAt") SELECT "breakMinutes", "createdAt", "durationMinutes", "id", "name", "startTime", "updatedAt" FROM "ShiftType";
DROP TABLE "ShiftType";
ALTER TABLE "new_ShiftType" RENAME TO "ShiftType";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
