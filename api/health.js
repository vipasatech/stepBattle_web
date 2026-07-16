/// GET /api/health
/// Smoke-test endpoint. Reports which env vars are present (never
/// the values) so you can quickly diagnose "webhook still failing"
/// scenarios in Vercel logs without leaking secrets.
export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      razorpay_key_id: !!process.env.RAZORPAY_KEY_ID,
      razorpay_key_secret: !!process.env.RAZORPAY_KEY_SECRET,
      razorpay_webhook_secret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
