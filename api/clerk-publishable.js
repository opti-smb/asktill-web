/** Runtime publishable key from Vercel env (never the secret). */
module.exports = (req, res) => {
  const publishableKey = String(
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '',
  ).trim();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ publishableKey });
};
