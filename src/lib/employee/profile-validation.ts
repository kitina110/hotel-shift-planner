export interface EmployeeProfileInput {
  name?: string;
  contractHoursPerWeek?: number;
  sortOrder?: number;
}

export function validateEmployeeProfileInput(
  input: EmployeeProfileInput,
): string | null {
  if (input.name != null && input.name.trim().length === 0) {
    return "Jméno zaměstnance nesmí být prázdné";
  }

  if (
    input.contractHoursPerWeek != null &&
    (Number.isNaN(input.contractHoursPerWeek) || input.contractHoursPerWeek <= 0)
  ) {
    return "Úvazek musí být kladné číslo hodin týdně";
  }

  if (input.sortOrder != null && (Number.isNaN(input.sortOrder) || input.sortOrder < 0)) {
    return "Pořadí musí být nezáporné celé číslo";
  }

  return null;
}
