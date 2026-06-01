export type PasswordContext = {
  email?: string;
  businessName?: string;
  fullName?: string;
};

const REPEATED = /(.)\1{2,}/;
const TOKEN = /[a-z0-9]+/gi;

function forbiddenTokens(ctx?: PasswordContext): Array<{ token: string; message: string }> {
  const out: Array<{ token: string; message: string }> = [];
  const business = ctx?.businessName?.trim();
  if (business) {
    const compact = business.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (compact.length >= 3) {
      out.push({ token: compact, message: 'Password cannot include your company name.' });
    }
    for (const part of business.match(TOKEN) ?? []) {
      if (part.length >= 3) {
        out.push({ token: part.toLowerCase(), message: 'Password cannot include your company name.' });
      }
    }
  }
  const fullName = ctx?.fullName?.trim();
  if (fullName) {
    for (const part of fullName.match(TOKEN) ?? []) {
      if (part.length >= 3) {
        out.push({ token: part.toLowerCase(), message: 'Password cannot include your name.' });
      }
    }
  }
  const email = ctx?.email?.trim();
  if (email && email.includes('@')) {
    const localRaw = email.split('@', 1)[0].toLowerCase();
    const compact = localRaw.replace(/[^a-z0-9]+/g, '');
    if (compact.length >= 3) {
      out.push({ token: compact, message: 'Password cannot include part of your email.' });
    }
    if (localRaw.length >= 3) {
      out.push({ token: localRaw, message: 'Password cannot include part of your email.' });
    }
    for (const part of localRaw.match(TOKEN) ?? []) {
      if (part.length >= 3) {
        out.push({ token: part.toLowerCase(), message: 'Password cannot include part of your email.' });
      }
    }
  }
  const seen = new Set<string>();
  return out.filter(({ token }) => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

/** Returns a user-facing error message, or null if the password is acceptable. */
export function validatePassword(password: string, ctx?: PasswordContext): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one special character.';
  if (REPEATED.test(password)) {
    return 'Avoid repeating the same character three or more times in a row.';
  }
  const lowered = password.toLowerCase();
  for (const { token, message } of forbiddenTokens(ctx)) {
    if (lowered.includes(token)) return message;
  }
  return null;
}

export const PASSWORD_HINT =
  'At least 8 characters with upper and lower case, a number, and a symbol. Do not use your name, company name, email, or repeated characters.';
