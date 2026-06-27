/** UI formatting helpers for coverage administration (no API / DB). */

export function formatGuestRange(minGuests: number, maxGuests: number | null): string {
  if (maxGuests === null) {
    return minGuests === 0 ? "0+" : `${minGuests}+`;
  }
  if (minGuests === maxGuests) return String(minGuests);
  return `${minGuests}–${maxGuests}`;
}

export function formatGuestRuleLabel(
  minGuests: number,
  maxGuests: number | null,
  staffCount: number,
): string {
  return `Hosté ${formatGuestRange(minGuests, maxGuests)} → ${staffCount} ${
    staffCount === 1 ? "zaměstnanec" : staffCount < 5 ? "zaměstnanci" : "zaměstnanců"
  }`;
}

export function formatIntervalRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function validateGuestRuleInput(input: {
  minGuests: number;
  maxGuests: string;
  staffCount: number;
}): string | null {
  if (Number.isNaN(input.minGuests) || input.minGuests < 0) {
    return "Minimální počet hostů musí být 0 nebo více";
  }
  if (Number.isNaN(input.staffCount) || input.staffCount < 1) {
    return "Počet zaměstnanců musí být alespoň 1";
  }
  if (input.maxGuests !== "") {
    const max = Number(input.maxGuests);
    if (Number.isNaN(max) || max < 0) {
      return "Maximální počet hostů musí být 0 nebo více";
    }
    if (max < input.minGuests) {
      return "Maximum hostů nesmí být menší než minimum";
    }
  }
  return null;
}
