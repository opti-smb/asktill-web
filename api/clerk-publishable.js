/** Runtime publishable key from Vercel env (never the secret, never asktill.com pk_live_). */
module.exports = (req, res) => {
  const raw = String(
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '',
  ).trim();
  const publishableKey = raw.startsWith('pk_live_') ? '' : raw;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ publishableKey });
};
