import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirementRuleInclude } from "@/lib/coverage-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intervalId = searchParams.get("intervalId");

    const rules = await prisma.coverageRequirementRule.findMany({
      where: intervalId ? { intervalId } : undefined,
      include: requirementRuleInclude,
      orderBy: [{ intervalId: "asc" }, { minGuests: "asc" }],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET /api/coverage-requirement-rules failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst pravidla pokrytí" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intervalId, minGuests, maxGuests, staffCount } = body;

    if (!intervalId || minGuests == null || staffCount == null) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    const interval = await prisma.coverageInterval.findUnique({
      where: { id: intervalId },
    });
    if (!interval) {
      return NextResponse.json({ error: "Interval neexistuje" }, { status: 404 });
    }

    const parsedMin = Number(minGuests);
    const parsedStaff = Number(staffCount);
    const parsedMax =
      maxGuests != null && maxGuests !== "" ? Number(maxGuests) : null;

    if (Number.isNaN(parsedMin) || Number.isNaN(parsedStaff)) {
      return NextResponse.json({ error: "Neplatná číselná pole" }, { status: 400 });
    }

    if (parsedMax != null && Number.isNaN(parsedMax)) {
      return NextResponse.json({ error: "Neplatné maximum hostů" }, { status: 400 });
    }

    if (parsedStaff < 1) {
      return NextResponse.json(
        { error: "Počet zaměstnanců musí být alespoň 1" },
        { status: 400 },
      );
    }

    const rule = await prisma.coverageRequirementRule.create({
      data: {
        intervalId,
        minGuests: parsedMin,
        maxGuests: parsedMax,
        staffCount: parsedStaff,
      },
      include: requirementRuleInclude,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("POST /api/coverage-requirement-rules failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit pravidlo" },
      { status: 500 },
    );
  }
}
