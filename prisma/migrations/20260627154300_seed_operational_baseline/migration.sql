-- Baseline operational data: zones, default demand profile, shift-to-zone mapping.
-- Intervals are NOT created — configure manually in the app.

INSERT INTO "OperationalZone" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT 'clzone000000000000000servis', 'Servis', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "OperationalZone" WHERE "name" = 'Servis');

INSERT INTO "OperationalZone" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT 'clzone00000000000000000bar', 'Bar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "OperationalZone" WHERE "name" = 'Bar');

INSERT INTO "OperationalZone" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT 'clzone000000000000kuchyne', 'Kuchyně', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "OperationalZone" WHERE "name" = 'Kuchyně');

INSERT INTO "DemandProfile" ("id", "name", "description", "isDefault", "createdAt", "updatedAt")
SELECT 'clprofile000000000default', 'Běžný provoz', 'Standardní provoz hotelu', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "DemandProfile" WHERE "name" = 'Běžný provoz');

UPDATE "ShiftType"
SET "zoneId" = (SELECT "id" FROM "OperationalZone" WHERE "name" = 'Bar')
WHERE "name" = 'Bar' AND "zoneId" IS NULL;

UPDATE "ShiftType"
SET "zoneId" = (SELECT "id" FROM "OperationalZone" WHERE "name" = 'Servis')
WHERE "name" = 'Servis' AND "zoneId" IS NULL;

UPDATE "ShiftType"
SET "zoneId" = (SELECT "id" FROM "OperationalZone" WHERE "name" = 'Kuchyně')
WHERE "name" = 'Kuchyně' AND "zoneId" IS NULL;
