import type {
  CoverageInterval,
  CoverageRequirementRule,
  OperationalZone,
} from "@/types";

export type CoverageZoneWithDetails = OperationalZone & {
  intervals: Array<CoverageInterval & { rules: CoverageRequirementRule[] }>;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Požadavek se nezdařil",
    );
  }
  return body as T;
}

export async function fetchCoverageZones(): Promise<CoverageZoneWithDetails[]> {
  const res = await fetch("/api/coverage-zones");
  return parseJsonResponse(res);
}

export async function createCoverageZone(name: string): Promise<CoverageZoneWithDetails> {
  const res = await fetch("/api/coverage-zones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() }),
  });
  return parseJsonResponse(res);
}

export async function updateCoverageZone(
  id: string,
  data: { name?: string; sortOrder?: number },
): Promise<CoverageZoneWithDetails> {
  const res = await fetch(`/api/coverage-zones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res);
}

export async function deleteCoverageZone(id: string): Promise<void> {
  const res = await fetch(`/api/coverage-zones/${id}`, { method: "DELETE" });
  await parseJsonResponse(res);
}

export async function createCoverageInterval(input: {
  zoneId: string;
  startTime: string;
  endTime: string;
  label?: string;
}): Promise<CoverageInterval & { rules: CoverageRequirementRule[] }> {
  const res = await fetch("/api/coverage-intervals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

export async function updateCoverageInterval(
  id: string,
  data: {
    startTime?: string;
    endTime?: string;
    label?: string | null;
    sortOrder?: number;
  },
): Promise<CoverageInterval & { rules: CoverageRequirementRule[] }> {
  const res = await fetch(`/api/coverage-intervals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res);
}

export async function deleteCoverageInterval(id: string): Promise<void> {
  const res = await fetch(`/api/coverage-intervals/${id}`, { method: "DELETE" });
  await parseJsonResponse(res);
}

export async function createCoverageRequirementRule(input: {
  intervalId: string;
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
}): Promise<CoverageRequirementRule> {
  const res = await fetch("/api/coverage-requirement-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

export async function updateCoverageRequirementRule(
  id: string,
  data: {
    minGuests?: number;
    maxGuests?: number | null;
    staffCount?: number;
  },
): Promise<CoverageRequirementRule> {
  const res = await fetch(`/api/coverage-requirement-rules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res);
}

export async function deleteCoverageRequirementRule(id: string): Promise<void> {
  const res = await fetch(`/api/coverage-requirement-rules/${id}`, {
    method: "DELETE",
  });
  await parseJsonResponse(res);
}
