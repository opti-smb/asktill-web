/** US states + DC for the EC2 create-account Business State field. Store `value` (CT, CA, NY). */

export type UsStateOption = { label: string; value: string };

export const US_STATES: UsStateOption[] = [
  { label: 'Alabama', value: 'AL' },
  { label: 'Alaska', value: 'AK' },
  { label: 'Arizona', value: 'AZ' },
  { label: 'Arkansas', value: 'AR' },
  { label: 'California', value: 'CA' },
  { label: 'Colorado', value: 'CO' },
  { label: 'Connecticut', value: 'CT' },
  { label: 'Delaware', value: 'DE' },
  { label: 'Florida', value: 'FL' },
  { label: 'Georgia', value: 'GA' },
  { label: 'Hawaii', value: 'HI' },
  { label: 'Idaho', value: 'ID' },
  { label: 'Illinois', value: 'IL' },
  { label: 'Indiana', value: 'IN' },
  { label: 'Iowa', value: 'IA' },
  { label: 'Kansas', value: 'KS' },
  { label: 'Kentucky', value: 'KY' },
  { label: 'Louisiana', value: 'LA' },
  { label: 'Maine', value: 'ME' },
  { label: 'Maryland', value: 'MD' },
  { label: 'Massachusetts', value: 'MA' },
  { label: 'Michigan', value: 'MI' },
  { label: 'Minnesota', value: 'MN' },
  { label: 'Mississippi', value: 'MS' },
  { label: 'Missouri', value: 'MO' },
  { label: 'Montana', value: 'MT' },
  { label: 'Nebraska', value: 'NE' },
  { label: 'Nevada', value: 'NV' },
  { label: 'New Hampshire', value: 'NH' },
  { label: 'New Jersey', value: 'NJ' },
  { label: 'New Mexico', value: 'NM' },
  { label: 'New York', value: 'NY' },
  { label: 'North Carolina', value: 'NC' },
  { label: 'North Dakota', value: 'ND' },
  { label: 'Ohio', value: 'OH' },
  { label: 'Oklahoma', value: 'OK' },
  { label: 'Oregon', value: 'OR' },
  { label: 'Pennsylvania', value: 'PA' },
  { label: 'Rhode Island', value: 'RI' },
  { label: 'South Carolina', value: 'SC' },
  { label: 'South Dakota', value: 'SD' },
  { label: 'Tennessee', value: 'TN' },
  { label: 'Texas', value: 'TX' },
  { label: 'Utah', value: 'UT' },
  { label: 'Vermont', value: 'VT' },
  { label: 'Virginia', value: 'VA' },
  { label: 'Washington', value: 'WA' },
  { label: 'West Virginia', value: 'WV' },
  { label: 'Wisconsin', value: 'WI' },
  { label: 'Wyoming', value: 'WY' },
  { label: 'District of Columbia', value: 'DC' },
];

export function stateDisplayLabel(state: UsStateOption): string {
  return state.label;
}

export function findUsState(code: string): UsStateOption | undefined {
  const value = code.trim().toUpperCase();
  return US_STATES.find((state) => state.value === value);
}

export function filterUsStates(query: string): UsStateOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked = US_STATES.map((state) => {
    const label = state.label.toLowerCase();
    const value = state.value.toLowerCase();
    let score = 0;
    if (value === q) score = 4;
    else if (label.startsWith(q)) score = 3;
    else if (value.startsWith(q)) score = 2;
    else if (label.includes(q)) score = 1;
    else return null;
    return { state, score };
  }).filter((row): row is { state: UsStateOption; score: number } => Boolean(row));
  ranked.sort((a, b) => b.score - a.score || a.state.label.localeCompare(b.state.label));
  return ranked.map((row) => row.state);
}

export type UsaLocationResult = { ok: true } | { ok: false; message: string };

/** Accepts the stored 2-letter code only (CT, CA, NY, …). */
export function validateUsaOnlyLocation(raw: string): UsaLocationResult {
  const code = raw.trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Select your business state.' };
  }
  if (!findUsState(code)) {
    return { ok: false, message: 'Select a US state.' };
  }
  return { ok: true };
}
