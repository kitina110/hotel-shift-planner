import { NextResponse } from "next/server";
import { getEmployeeWorkload } from "@/lib/scheduler/service";

export async function GET() {
  const workload = await getEmployeeWorkload(8);
  return NextResponse.json(workload);
}
