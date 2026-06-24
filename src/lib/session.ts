/** App JWT lifetime — must match Authentication Service JWT_EXPIRE_SECONDS (3600s). */
export const SESSION_TTL_SECONDS = 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
export const SESSION_TTL_LABEL = '1 hour';