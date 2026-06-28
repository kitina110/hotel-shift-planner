import type { PrismaClient } from "@/generated/prisma/client";

type DbClient = Pick<PrismaClient, "employee">;

export function validateReorderPayload(orderedIds: unknown): string[] | null {
  if (!Array.isArray(orderedIds)) return null;
  const ids = orderedIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids;
}

/** Persist global employee order (0 … n−1) for the given id sequence. */
export async function reorderEmployeesByIds(
  db: DbClient,
  orderedIds: string[],
): Promise<void> {
  const existing = await db.employee.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((row) => row.id));

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Unknown employee id: ${id}`);
    }
  }

  if (orderedIds.length !== existing.length) {
    throw new Error("Reorder must include every employee");
  }

  for (let sortOrder = 0; sortOrder < orderedIds.length; sortOrder++) {
    await db.employee.update({
      where: { id: orderedIds[sortOrder] },
      data: { sortOrder },
    });
  }
}

/** Reorder a visible subset while preserving relative order of the rest. */
export function mergeVisibleReorder(
  allIdsInOrder: string[],
  visibleIdsInNewOrder: string[],
): string[] {
  const visibleSet = new Set(visibleIdsInNewOrder);
  const queue = [...visibleIdsInNewOrder];
  return allIdsInOrder.map((id) => (visibleSet.has(id) ? queue.shift()! : id));
}
