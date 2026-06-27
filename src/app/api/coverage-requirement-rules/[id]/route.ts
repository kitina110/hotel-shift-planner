import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirementRuleInclude } from "@/lib/coverage-api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.coverageRequirementRule.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pravidlo neexistuje" }, { status: 404 });
    }

    const rule = await prisma.coverageRequirementRule.update({
      where: { id },
      data: {
        ...(body.minGuests != null ? { minGuests: Number(body.minGuests) } : {}),
        ...(body.maxGuests !== undefined
          ? {
              maxGuests:
                body.maxGuests != null && body.maxGuests !== ""
                  ? Number(body.maxGuests)
                  : null,
            }
          : {}),
        ...(body.staffCount != null ? { staffCount: Number(body.staffCount) } : {}),
      },
      include: requirementRuleInclude,
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("PUT /api/coverage-requirement-rules/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se upravit pravidlo" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.coverageRequirementRule.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pravidlo neexistuje" }, { status: 404 });
    }

    await prisma.coverageRequirementRule.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/coverage-requirement-rules/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat pravidlo" },
      { status: 500 },
    );
  }
}
