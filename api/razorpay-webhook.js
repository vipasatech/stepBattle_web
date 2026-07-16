import crypto from "node:crypto";

import { supabaseAdmin } from "./_supabase-admin.js";
import { PLANS, periodDurationMs } from "./_plans.js";

/// POST /api/razorpay-webhook
///
/// The authority on payment status. Register this URL in Razorpay
/// Dashboard → Webhooks with events:
///   * payment.captured   → happy-path settlement
///   * payment.failed     → failure logging (payment already NACK'd
///                          by the checkout modal too)
///   * order.paid         → belt-and-braces for standard checkout
///
/// Signature verification uses `RAZORPAY_WEBHOOK_SECRET` from env,
/// which you also register in the same webhook config screen — pick
/// a strong random string; keep it in Vercel env vars only.
///
/// On payment.captured for a known order:
///   1. Update the corresponding subscription_orders row → status = "success"
///   2. Update profiles.subscription_tier + subscription_expires_at
///      + subscription_billing_period → the tier & duration from the
///      pending order row (never trust the webhook's own notes for
///      tier — read from the DB row we staged in create-order).
export const config = {
  api: {
    // Razorpay signs the RAW body — Vercel must NOT parse it as JSON
    // before we get to it, otherwise the HMAC won't match.
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function verifySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks.
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("razorpay-webhook: RAZORPAY_WEBHOOK_SECRET missing");
    return res.status(500).end();
  }

  const signature = req.headers["x-razorpay-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ error: "Missing signature header" });
  }

  const rawBody = await readRawBody(req);
  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("razorpay-webhook: signature mismatch");
    return res.status(400).json({ error: "Invalid signature" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const event = payload?.event;
  console.log("razorpay-webhook received:", event);

  const sb = supabaseAdmin();

  // Extract the Razorpay entities. Different event types nest
  // things slightly differently — pull what we need defensively.
  const payment = payload?.payload?.payment?.entity;
  const order = payload?.payload?.order?.entity;
  const razorpayOrderId = payment?.order_id ?? order?.id;
  if (!razorpayOrderId) {
    return res
      .status(200)
      .json({ ok: true, note: "no order id in payload — nothing to do" });
  }

  // Find our staged order row. This is the SOURCE OF TRUTH for
  // (user_id, tier, billing_period) — never trust webhook notes.
  const { data: orderRow, error: fetchErr } = await sb
    .from("subscription_orders")
    .select(
      "id, user_id, tier, billing_period, amount_paise, status",
    )
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (fetchErr) {
    console.error("subscription_orders fetch:", fetchErr);
    return res.status(500).end();
  }
  if (!orderRow) {
    console.warn(
      "razorpay-webhook: order not found for id",
      razorpayOrderId,
    );
    // 200 so Razorpay doesn't keep retrying — the order simply
    // wasn't created via our /api/create-order. Nothing to do.
    return res.status(200).json({ ok: true, note: "unknown order" });
  }

  const commonPayload = {
    razorpay_payment_id: payment?.id ?? null,
    webhook_payload: payload,
  };

  switch (event) {
    case "payment.captured":
    case "order.paid": {
      // Idempotency: if we've already settled this order, don't
      // re-award or re-extend the subscription.
      if (orderRow.status === "success") {
        return res
          .status(200)
          .json({ ok: true, note: "already settled" });
      }
      const expiresAt = new Date(
        Date.now() + periodDurationMs(orderRow.billing_period),
      ).toISOString();

      const { error: orderUpdErr } = await sb
        .from("subscription_orders")
        .update({
          ...commonPayload,
          status: "success",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderRow.id);
      if (orderUpdErr) console.error("order update:", orderUpdErr);

      // Bump the user's tier + expiry. subscription_billing_period
      // mirrors what they bought so the Profile card can show
      // "Renews / Monthly".
      const { error: profileErr } = await sb
        .from("profiles")
        .update({
          subscription_tier: orderRow.tier,
          subscription_expires_at: expiresAt,
          subscription_billing_period: orderRow.billing_period,
        })
        .eq("id", orderRow.user_id);
      if (profileErr) console.error("profile tier bump:", profileErr);

      console.log(
        `razorpay-webhook: user ${orderRow.user_id} → ${orderRow.tier} until ${expiresAt}`,
      );
      return res.status(200).json({ ok: true });
    }

    case "payment.failed": {
      await sb
        .from("subscription_orders")
        .update({
          ...commonPayload,
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderRow.id);
      return res.status(200).json({ ok: true });
    }

    default:
      // Ignore other events (refund.processed, etc.) — 200 keeps
      // Razorpay from retrying.
      return res
        .status(200)
        .json({ ok: true, note: `ignored event ${event}` });
  }
}
