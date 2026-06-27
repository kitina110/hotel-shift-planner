import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { zoneInclude } from "@/lib/coverage-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const zone = await prisma.operationalZone.findUnique({
      where: { id },
      include: zoneInclude,
    });

    if (!zone) {
      return NextResponse.json({ error: "Zóna neexistuje" }, { status: 404 });
    }

    return NextResponse.json(zone);
  } catch (error) {
    console.error("GET /api/coverage-zones/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst zónu" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.operationalZone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Zóna neexistuje" }, { status: 404 });
    }

    const name = body.name != null ? String(body.name).trim() : undefined;
    if (name === "") {
      return NextResponse.json({ error: "Název zóny nesmí být prázdný" }, { status: 400 });
    }

    const zone = await prisma.operationalZone.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(body.sortOrder != null ? { sortOrder: Number(body.sortOrder) } : {}),
      },
      include: zoneInclude,
    });

    return NextResponse.json(zone);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Zóna s tímto názvem již existuje" },
        { status: 409 },
      );
    }
    console.error("PUT /api/coverage-zones/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se upravit zónu" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.operationalZone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Zóna neexistuje" }, { status: 404 });
    }

    await prisma.operationalZone.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/coverage-zones/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat zónu" },
      { status: 500 },
    );
  }
}
