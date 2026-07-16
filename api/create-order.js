import Razorpay from "razorpay";

import { supabaseAdmin } from "./_supabase-admin.js";
import { PLANS, priceInPaise } from "./_plans.js";

/// POST /api/create-order
/// Body: { uid: string, plan: "pro" | "family", period: "monthly" | "yearly" }
/// Returns: { orderId, keyId, amount, currency }
///
/// - Validates inputs
/// - Confirms the uid corresponds to a real Supabase profile (basic
///   "is this actually a user" check)
/// - Creates a Razorpay order using the server-side key_secret
/// - Inserts a `pending` row in public.subscription_orders so we can
///   correlate the webhook against a known order
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, plan, period } = req.body ?? {};

  if (typeof uid !== "string" || uid.length === 0) {
    return res.status(400).json({ error: "Missing uid" });
  }
  if (!PLANS[plan]) {
    return res.status(400).json({ error: "Unknown plan" });
  }
  if (!["monthly", "yearly"].includes(period)) {
    return res.status(400).json({ error: "Invalid period" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({
      error:
        "Server not configured — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing.",
    });
  }

  const sb = supabaseAdmin();

  // Sanity: uid must exist in profiles. Prevents a random client
  // creating orders for user ids that don't exist. Also pull the
  // user's email + display name so the checkout modal can prefill
  // (saves the user from retyping info the app already knows).
  const { data: profileRow, error: profileErr } = await sb
    .from("profiles")
    .select("id, email, display_name, preferred_name")
    .eq("id", uid)
    .maybeSingle();
  if (profileErr) {
    return res
      .status(500)
      .json({ error: `Profile lookup failed: ${profileErr.message}` });
  }
  if (!profileRow) {
    return res.status(404).json({ error: "Unknown user" });
  }

  const amountPaise = priceInPaise(plan, period);

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      // Notes travel with the order + are echoed in the webhook,
      // giving us a second signal for correlation.
      notes: { uid, plan, period },
    });
  } catch (e) {
    return res.status(502).json({
      error: `Razorpay order create failed: ${
        e?.error?.description ?? e?.message ?? String(e)
      }`,
    });
  }

  // Stage a pending row so the webhook can UPDATE it in place with
  // the payment id / final status. Uniquely keyed by razorpay_order_id.
  const { error: orderInsertErr } = await sb
    .from("subscription_orders")
    .insert({
      user_id: uid,
      razorpay_order_id: order.id,
      tier: plan,
      billing_period: period,
      amount_paise: amountPaise,
      currency: "INR",
      status: "pending",
    });
  // Insert may fail if the same order id already exists (unlikely
  // outside a retry loop). Log-and-continue: the webhook can still
  // reconcile via razorpay_order_id.
  if (orderInsertErr && orderInsertErr.code !== "23505") {
    console.error("subscription_orders insert:", orderInsertErr);
  }

  return res.status(200).json({
    orderId: order.id,
    keyId,
    amount: order.amount,
    currency: order.currency,
    user: {
      name: profileRow.preferred_name ?? profileRow.display_name ?? "",
      email: profileRow.email ?? "",
      contact: "",
    },
  });
}
