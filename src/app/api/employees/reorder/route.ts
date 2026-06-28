import { NextResponse } from "next/server";
import {
  reorderEmployeesByIds,
  validateReorderPayload,
} from "@/lib/employee/reorder-employees";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderedIds = validateReorderPayload(body.orderedIds);

  if (!orderedIds) {
    return NextResponse.json(
      { error: "orderedIds must be a non-empty array of unique employee ids" },
      { status: 400 },
    );
  }

  try {
    await reorderEmployeesByIds(prisma, orderedIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodařilo se uložit pořadí";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
