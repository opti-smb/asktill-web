/** Post-login destination — onboarding unless caller passed an explicit return path. */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  const from = explicitFrom?.trim();
  return from || '/onboarding';
}
