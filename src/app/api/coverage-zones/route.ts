import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { zoneInclude } from "@/lib/coverage-api";

export async function GET() {
  try {
    const zones = await prisma.operationalZone.findMany({
      include: zoneInclude,
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    console.error("GET /api/coverage-zones failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst provozní oblasti" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const sortOrder = body.sortOrder != null ? Number(body.sortOrder) : undefined;

    if (!name) {
      return NextResponse.json({ error: "Chybí název zóny" }, { status: 400 });
    }

    const zone = await prisma.operationalZone.create({
      data: {
        name,
        ...(sortOrder != null && !Number.isNaN(sortOrder) ? { sortOrder } : {}),
      },
      include: zoneInclude,
    });

    return NextResponse.json(zone, { status: 201 });
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
    console.error("POST /api/coverage-zones failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit zónu" },
      { status: 500 },
    );
  }
}
