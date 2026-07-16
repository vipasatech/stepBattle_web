import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-metrics?trendGranularity=day|week|month
///
/// Returns the 7 top-of-panel metrics + a trend array of new signups
/// per bucket (last 12 buckets at the requested granularity, week by
/// default).
///
/// All queries fire in parallel via Promise.all. There's no caching
/// on the server; the admin panel caches the whole payload in
/// browser memory until the user clicks Refresh.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const granularity = ["day", "week", "month"].includes(req.query.trendGranularity)
    ? req.query.trendGranularity
    : "week";

  const sb = supabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Local yyyy-MM-dd date strings match step_logs.date, which the
  // mobile app writes in the user's local timezone. Using UTC here
  // means DAU is "distinct users whose local day equals server UTC's
  // yyyy-MM-dd" — for a mostly-India userbase (UTC+5:30) that's the
  // same day 99% of the time.
  const todayStr = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const [
    totalUsersRes,
    activeProRes,
    activeFamilyRes,
    ordersRes,
    dauRes,
    mauRes,
    trendRes,
  ] = await Promise.all([
    sb.from("profiles").select("id", { count: "exact", head: true }),

    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "pro")
      .gte("subscription_expires_at", nowIso),

    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "family")
      .gte("subscription_expires_at", nowIso),

    sb
      .from("subscription_orders")
      .select("amount_paise")
      .eq("status", "success")
      .gte("created_at", monthStart.toISOString()),

    // DAU: distinct user_ids with a step_logs row for today's date.
    // pull rows then dedupe client-side — Postgres has no cheap
    // COUNT(DISTINCT) via PostgREST without an RPC. Row count is
    // bounded by (# active users today), so this is fine.
    sb.from("step_logs").select("user_id").eq("date", todayStr),

    // MAU: distinct user_ids with any step_logs row in the last 30 days.
    sb.from("step_logs").select("user_id").gte("date", thirtyDaysAgoStr),

    computeTrend(sb, granularity),
  ]);

  const err =
    totalUsersRes.error ??
    activeProRes.error ??
    activeFamilyRes.error ??
    ordersRes.error ??
    dauRes.error ??
    mauRes.error ??
    trendRes.error;
  if (err) {
    return res.status(500).json({ error: err.message });
  }

  const mtdPaise = (ordersRes.data ?? []).reduce(
    (acc, r) => acc + (r.amount_paise ?? 0),
    0,
  );

  const distinctDau = new Set((dauRes.data ?? []).map((r) => r.user_id)).size;
  const distinctMau = new Set((mauRes.data ?? []).map((r) => r.user_id)).size;

  return res.status(200).json({
    cards: {
      totalUsers: totalUsersRes.count ?? 0,
      activePro: activeProRes.count ?? 0,
      activeFamily: activeFamilyRes.count ?? 0,
      mtdRevenueRupees: Math.round(mtdPaise / 100),
      mtdOrders: ordersRes.data?.length ?? 0,
      mau: distinctMau,
      dau: distinctDau,
    },
    trend: {
      granularity,
      buckets: trendRes.buckets, // [{ label, isoStart, count }]
    },
    generatedAt: now.toISOString(),
    monthStart: monthStart.toISOString(),
  });
}

/// Compute [{ label, isoStart, count }] for the last 12 buckets of
/// new profile signups at the requested granularity. We generate the
/// full bucket list client-side so weeks with 0 new signups don't
/// vanish from the chart.
async function computeTrend(sb, granularity) {
  const now = new Date();
  const buckets = generateBuckets(now, granularity, 12);
  const windowStart = buckets[0].startDate;

  const { data, error } = await sb
    .from("profiles")
    .select("created_at")
    .gte("created_at", windowStart.toISOString());
  if (error) return { error };

  // Bucket the timestamps in JS — one pass, O(n * 12) worst case.
  const counts = buckets.map(() => 0);
  for (const row of data ?? []) {
    const t = new Date(row.created_at);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].startDate) {
        counts[i] += 1;
        break;
      }
    }
  }

  return {
    error: null,
    buckets: buckets.map((b, i) => ({
      label: b.label,
      isoStart: b.startDate.toISOString(),
      count: counts[i],
    })),
  };
}

function generateBuckets(now, granularity, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (granularity === "day") {
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push({ startDate: d, label: shortDayLabel(d) });
    } else if (granularity === "week") {
      d.setDate(d.getDate() - i * 7);
      // Snap to Monday (ISO week start)
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + mondayOffset);
      d.setHours(0, 0, 0, 0);
      out.push({ startDate: d, label: shortDayLabel(d) });
    } else {
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      out.push({ startDate: d, label: shortMonthLabel(d) });
    }
  }
  return out;
}

function shortDayLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
function shortMonthLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
