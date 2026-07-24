/**
 * Ask chat chips. Full catalog (intent + extremum) lives in Agents-Service:
 * `app/data/supported_questions.json` (mirrored in backend `app/data/`).
 * Chip wording can include extras (e.g. reconciliation) — POST /api/ask still parses by intent rules.
 */
export const SAMPLE_ASK_QUESTIONS = [
  'What is the highest purchase this month?',
  'Which item had the highest sale?',
  'What are my highest fees?',
  'Why is there a reconciliation gap?',
];
