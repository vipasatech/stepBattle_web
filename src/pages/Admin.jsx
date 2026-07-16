import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Flag,
  IndianRupee,
  Image as ImageIcon,
  LogOut,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import styles from "./Admin.module.css";

/// Admin panel — magic-link auth + is_admin gate + 4 tabs.
///
/// The panel is a single-file surface (no nested routing) because
/// tab-switching is instant, all data lives behind /api/admin-*,
/// and it keeps the state simple: one query per tab, cached in
/// component state, refreshable on demand.
export default function Admin() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("initializing");
  const [error, setError] = useState("");

  // Bootstrap: restore any existing supabase session on first
  // render, then subscribe to future auth changes.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setStatus(data?.session ? "checking-admin" : "unauth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s ?? null);
      setStatus(s ? "checking-admin" : "unauth");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // When we have a session, ping /api/admin-metrics — it's the
  // cheapest endpoint that requires is_admin, so it doubles as
  // our "am I actually an admin?" probe.
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch("/api/admin-metrics", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403) {
        setStatus("forbidden");
        return;
      }
      if (!res.ok) {
        setError(`Failed to load: ${res.status}`);
        setStatus("error");
        return;
      }
      const json = await res.json();
      setMetrics(json);
      setStatus("ready");
    })();
  }, [session]);

  if (status === "initializing") {
    return <FullscreenMessage>Loading…</FullscreenMessage>;
  }
  if (status === "unauth" || !session) {
    return <LoginForm />;
  }
  if (status === "checking-admin") {
    return <FullscreenMessage>Verifying admin access…</FullscreenMessage>;
  }
  if (status === "forbidden") {
    return (
      <FullscreenMessage tone="error">
        <strong>Not authorized.</strong> This account isn't marked as
        admin.
        <SignOutButton />
      </FullscreenMessage>
    );
  }
  if (status === "error") {
    return (
      <FullscreenMessage tone="error">
        {error}
        <SignOutButton />
      </FullscreenMessage>
    );
  }

  return <AdminShell session={session} metrics={metrics} setMetrics={setMetrics} />;
}

function LoginForm() {
  // Two-step OTP flow. Supabase's default email template on this
  // project sends a 6- or 7-digit code (not a magic link), so we
  // let the user paste the code here rather than requiring a
  // link tap. `signInWithOtp` sends the code; `verifyOtp` with
  // type='email' exchanges it for a session — same result as
  // clicking the link would have produced.
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  async function sendCode(e) {
    e.preventDefault();
    if (!email) return;
    setState({ status: "sending", message: "" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Keeps the flow single-device: even if Supabase's template
        // eventually adds a link, clicking it lands the user back
        // on /admin instead of a bare confirmation page.
        // Uses the current URL as-is so the redirect always
        // lands where the admin actually started — no hardcoded
        // path to drift out of sync with the route.
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }
    setStep("code");
    setState({ status: "sent", message: `Code sent to ${email}.` });
  }

  async function verifyCode(e) {
    e.preventDefault();
    if (!code) return;
    setState({ status: "verifying", message: "" });
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }
    // The onAuthStateChange listener up in Admin() picks up the
    // new session and transitions the page automatically.
    setState({ status: "idle", message: "" });
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <ShieldCheck size={32} className={styles.loginIcon} />
        <h1 className={styles.loginTitle}>StepBattle Admin</h1>
        <p className={styles.loginSub}>
          {step === "email"
            ? "Sign in with your admin email. We'll send a one-time code."
            : `Enter the code we just emailed to ${email}.`}
        </p>

        {step === "email" && (
          <form onSubmit={sendCode} className={styles.loginForm}>
            <div className={styles.loginInputWrap}>
              <Mail size={16} className={styles.loginInputIcon} />
              <input
                className={styles.loginInput}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className={styles.loginButton}
              disabled={state.status === "sending"}
            >
              {state.status === "sending" ? "Sending…" : "Send code"}
            </button>
            {state.status === "error" && (
              <p className={styles.loginError}>{state.message}</p>
            )}
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className={styles.loginForm}>
            <input
              className={`${styles.loginInput} ${styles.loginCodeInput}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
              placeholder="123 456"
              required
              autoFocus
            />
            <button
              type="submit"
              className={styles.loginButton}
              disabled={state.status === "verifying"}
            >
              {state.status === "verifying" ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              className={styles.loginBackButton}
              onClick={() => {
                setStep("email");
                setCode("");
                setState({ status: "idle", message: "" });
              }}
            >
              Use a different email
            </button>
            {state.status === "sent" && (
              <p className={styles.loginNote}>{state.message}</p>
            )}
            {state.status === "error" && (
              <p className={styles.loginError}>{state.message}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

function AdminShell({ session, metrics, setMetrics }) {
  const [tab, setTab] = useState("users");
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${session.access_token}` }),
    [session.access_token],
  );

  const refreshMetrics = useCallback(async () => {
    const res = await fetch("/api/admin-metrics", { headers: authHeader });
    if (res.ok) setMetrics(await res.json());
  }, [authHeader, setMetrics]);

  return (
    <main className={styles.shell}>
      <header className={styles.shellHeader}>
        <div className={styles.shellHeaderLeft}>
          <ShieldCheck size={18} />
          <span className={styles.shellTitle}>StepBattle Admin</span>
        </div>
        <div className={styles.shellHeaderRight}>
          <span className={styles.shellMeta}>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <MetricsBar metrics={metrics} onRefresh={refreshMetrics} />

      <nav className={styles.tabs}>
        <TabButton
          active={tab === "users"}
          onClick={() => setTab("users")}
          icon={<Users size={14} />}
          label="Users"
        />
        <TabButton
          active={tab === "payments"}
          onClick={() => setTab("payments")}
          icon={<IndianRupee size={14} />}
          label="Payments"
        />
        <TabButton
          active={tab === "missions"}
          onClick={() => setTab("missions")}
          icon={<Flag size={14} />}
          label="Missions"
        />
        <TabButton
          active={tab === "activity"}
          onClick={() => setTab("activity")}
          icon={<Activity size={14} />}
          label="Activity"
        />
      </nav>

      <section className={styles.tabBody}>
        {tab === "users" && (
          <UsersTab authHeader={authHeader} onChange={refreshMetrics} />
        )}
        {tab === "payments" && (
          <PaymentsTab authHeader={authHeader} onChange={refreshMetrics} />
        )}
        {tab === "missions" && <MissionsTab authHeader={authHeader} />}
        {tab === "activity" && <ActivityTab authHeader={authHeader} />}
      </section>
    </main>
  );
}

function MetricsBar({ metrics, onRefresh }) {
  if (!metrics) return null;
  const cards = [
    { label: "Paid users", value: metrics.paidTotal, icon: <Users size={14} /> },
    { label: "Active Pro", value: metrics.activePro, icon: <BarChart3 size={14} /> },
    {
      label: "Active Family",
      value: metrics.activeFamily,
      icon: <BarChart3 size={14} />,
    },
    {
      label: "MTD revenue",
      value: `₹${metrics.monthRevenueRupees.toLocaleString("en-IN")}`,
      icon: <IndianRupee size={14} />,
    },
    {
      label: "MTD orders",
      value: metrics.monthOrderCount,
      icon: <IndianRupee size={14} />,
    },
    { label: "Admins", value: metrics.admins, icon: <ShieldCheck size={14} /> },
  ];
  return (
    <div className={styles.metricsBar}>
      {cards.map((c) => (
        <div key={c.label} className={styles.metricCard}>
          <div className={styles.metricLabel}>
            {c.icon}
            <span>{c.label}</span>
          </div>
          <div className={styles.metricValue}>{c.value}</div>
        </div>
      ))}
      <button className={styles.refresh} onClick={onRefresh}>
        <RefreshCcw size={13} />
        Refresh
      </button>
    </div>
  );
}

function UsersTab({ authHeader, onChange }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin-users-list?${params}`, {
      headers: authHeader,
    });
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users);
    }
    setLoading(false);
  }, [authHeader, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or name…"
            className={styles.searchInput}
          />
        </div>
        <button className={styles.refresh} onClick={load}>
          <RefreshCcw size={13} />
          Refresh
        </button>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Tier</th>
              <th>Expires</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className={styles.tableEmpty}>Loading…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.tableEmpty}>
                  No users match.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userCell}>
                    <span className={styles.userName}>
                      {u.preferred_name ?? u.display_name ?? "—"}
                      {u.is_admin && (
                        <span className={styles.adminBadge}>admin</span>
                      )}
                    </span>
                    <span className={styles.userEmail}>{u.email}</span>
                    <span className={styles.userId}>{u.id}</span>
                  </div>
                </td>
                <td>
                  <TierBadge tier={u.subscription_tier ?? "free"} />
                </td>
                <td className={styles.dim}>
                  {formatDate(u.subscription_expires_at) ?? "—"}
                </td>
                <td className={styles.dim}>
                  {formatDate(u.created_at) ?? "—"}
                </td>
                <td>
                  <button
                    className={styles.rowAction}
                    onClick={() => setEditing(u)}
                  >
                    Set tier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <SetTierModal
          user={editing}
          authHeader={authHeader}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChange();
          }}
        />
      )}
    </>
  );
}

function SetTierModal({ user, authHeader, onClose, onSaved }) {
  const [tier, setTier] = useState(user.subscription_tier ?? "free");
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/admin-set-tier", {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUid: user.id,
        tier,
        extendMonths: tier === "free" ? 0 : Number(months),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Set subscription tier</h3>
        <p className={styles.modalSub}>
          {user.email} · currently{" "}
          <TierBadge tier={user.subscription_tier ?? "free"} inline />
        </p>

        <label className={styles.modalLabel}>New tier</label>
        <div className={styles.tierPicker}>
          {["free", "pro", "family"].map((t) => (
            <button
              key={t}
              className={`${styles.tierOption} ${
                tier === t ? styles.tierOptionOn : ""
              }`}
              onClick={() => setTier(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tier !== "free" && (
          <>
            <label className={styles.modalLabel}>Duration (months)</label>
            <div className={styles.monthsPicker}>
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  className={`${styles.monthChip} ${
                    Number(months) === m ? styles.monthChipOn : ""
                  }`}
                  onClick={() => setMonths(m)}
                >
                  {m} mo
                </button>
              ))}
              <input
                type="number"
                min="0"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className={styles.monthInput}
              />
            </div>
            <p className={styles.modalHint}>
              12 mo is recorded as yearly, anything smaller as monthly.
              Existing expiry (if any) is overwritten.
            </p>
          </>
        )}

        {err && <p className={styles.modalError}>{err}</p>}

        <div className={styles.modalActions}>
          <button className={styles.modalGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.modalPrimary}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ authHeader, onChange }) {
  const [status, setStatus] = useState("all");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/admin-payments-list?status=${status}&limit=100`,
      { headers: authHeader },
    );
    if (res.ok) {
      const json = await res.json();
      setPayments(json.payments);
    }
    setLoading(false);
  }, [authHeader, status]);

  useEffect(() => {
    load();
  }, [load]);

  function downloadCsv() {
    // The CSV endpoint requires the same bearer token; a plain <a>
    // download can't attach a header, so we fetch → blob → link.
    fetch(`/api/admin-payments-csv?status=${status}`, {
      headers: authHeader,
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stepbattle-payments-${status}-${
          new Date().toISOString().slice(0, 10)
        }.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <>
      <div className={styles.filterRow}>
        <div className={styles.filterPills}>
          {["all", "success", "failed", "pending", "refunded"].map((s) => (
            <button
              key={s}
              className={`${styles.filterPill} ${
                status === s ? styles.filterPillOn : ""
              }`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={styles.filterRowRight}>
          <button className={styles.refresh} onClick={load}>
            <RefreshCcw size={13} />
            Refresh
          </button>
          <button className={styles.refresh} onClick={downloadCsv}>
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment id</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className={styles.tableEmpty}>Loading…</td>
              </tr>
            )}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.tableEmpty}>
                  No payments match.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id}>
                <td className={styles.dim}>{formatDate(p.created_at)}</td>
                <td>
                  <div className={styles.userCell}>
                    <span className={styles.userName}>
                      {p.profiles?.preferred_name ??
                        p.profiles?.display_name ??
                        "—"}
                    </span>
                    <span className={styles.userEmail}>
                      {p.profiles?.email ?? p.user_id}
                    </span>
                  </div>
                </td>
                <td>
                  <TierBadge tier={p.tier} />
                  <span className={styles.dim}> · {p.billing_period}</span>
                </td>
                <td>₹{((p.amount_paise ?? 0) / 100).toLocaleString("en-IN")}</td>
                <td>
                  <StatusPill status={p.status} />
                </td>
                <td className={styles.mono}>
                  {p.razorpay_payment_id ?? "—"}
                </td>
                <td>
                  {p.status === "success" && (
                    <button
                      className={styles.rowAction}
                      onClick={() => setRefunding(p)}
                    >
                      <Undo2 size={12} />
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {refunding && (
        <RefundModal
          payment={refunding}
          authHeader={authHeader}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            load();
            onChange();
          }}
        />
      )}
    </>
  );
}

function RefundModal({ payment, authHeader, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/admin-refund", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: payment.razorpay_payment_id,
        reason: reason || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    onDone();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Refund payment</h3>
        <p className={styles.modalSub}>
          ₹{((payment.amount_paise ?? 0) / 100).toLocaleString("en-IN")} ·{" "}
          {payment.tier} · {payment.profiles?.email}
        </p>
        <p className={styles.modalHint}>
          Full refund via Razorpay. Doesn't automatically downgrade the
          user — do that separately on the Users tab if you want.
        </p>
        <label className={styles.modalLabel}>Reason (optional)</label>
        <textarea
          className={styles.modalTextarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. duplicate charge, user requested"
          rows={3}
        />
        {err && <p className={styles.modalError}>{err}</p>}
        <div className={styles.modalActions}>
          <button className={styles.modalGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.modalPrimary}
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Refunding…" : "Refund now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ authHeader }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin-activity-log?limit=200", {
      headers: authHeader,
    });
    if (res.ok) {
      const json = await res.json();
      setEntries(json.entries);
    }
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className={styles.filterRow}>
        <span className={styles.dim}>
          Last {entries.length} entries · newest first
        </span>
        <button className={styles.refresh} onClick={load}>
          <RefreshCcw size={13} />
          Refresh
        </button>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className={styles.tableEmpty}>Loading…</td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.tableEmpty}>
                  No activity yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className={styles.dim}>{formatDate(e.created_at)}</td>
                <td>
                  <span className={styles.userName}>
                    {e.admin_name ?? e.admin_email ?? "—"}
                  </span>
                </td>
                <td>
                  <span className={styles.actionPill}>{e.action}</span>
                </td>
                <td>
                  <span className={styles.userEmail}>
                    {e.target_email ?? e.target_user_id ?? "—"}
                  </span>
                </td>
                <td>
                  <code className={styles.detailsBlob}>
                    {JSON.stringify(e.details ?? {})}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MissionsTab({ authHeader }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | mission | 'new'
  const [busyDelete, setBusyDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin-missions-list", {
      headers: authHeader,
    });
    if (res.ok) {
      const json = await res.json();
      setMissions(json.missions);
    }
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    load();
  }, [load]);

  async function del(id) {
    if (!confirm(`Delete mission "${id}"? This cannot be undone.`)) return;
    setBusyDelete(id);
    const res = await fetch("/api/admin-missions-delete", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusyDelete(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body?.error ?? `HTTP ${res.status}`);
      return;
    }
    load();
  }

  return (
    <>
      <div className={styles.filterRow}>
        <span className={styles.dim}>
          {missions.length} mission{missions.length === 1 ? "" : "s"} in the catalog · higher display_order sorts first on Home
        </span>
        <div className={styles.filterRowRight}>
          <button className={styles.refresh} onClick={load}>
            <RefreshCcw size={13} />
            Refresh
          </button>
          <button
            className={styles.rowAction}
            onClick={() => setEditing("new")}
            style={{ padding: "8px 14px" }}
          >
            <Plus size={13} />
            New mission
          </button>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mission</th>
              <th>Type</th>
              <th>Category</th>
              <th>Target</th>
              <th>XP</th>
              <th>Featured</th>
              <th>Order</th>
              <th>Poster</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className={styles.tableEmpty}>Loading…</td>
              </tr>
            )}
            {!loading && missions.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.tableEmpty}>
                  No missions yet — click "New mission" to add one.
                </td>
              </tr>
            )}
            {missions.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className={styles.userCell}>
                    <span className={styles.userName}>{m.title}</span>
                    <span className={styles.userId}>{m.id}</span>
                  </div>
                </td>
                <td>
                  <span className={styles.actionPill}>{m.type}</span>
                </td>
                <td className={styles.dim}>{m.category}</td>
                <td>{m.target_value?.toLocaleString?.("en-IN") ?? m.target_value}</td>
                <td>{m.xp_reward}</td>
                <td>
                  {m.should_show_in_home ? (
                    <span
                      className={styles.tierPill}
                      style={{
                        background: "rgba(251, 191, 36, 0.18)",
                        color: "#fbbf24",
                      }}
                    >
                      Featured
                    </span>
                  ) : (
                    <span className={styles.dim}>—</span>
                  )}
                </td>
                <td className={styles.dim}>{m.display_order}</td>
                <td>
                  {m.poster_url ? (
                    <a
                      href={m.poster_url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.posterThumbLink}
                    >
                      <img
                        src={m.poster_url}
                        alt=""
                        className={styles.posterThumb}
                      />
                    </a>
                  ) : (
                    <span className={styles.dim}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      className={styles.rowAction}
                      onClick={() => setEditing(m)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.rowActionDanger}
                      onClick={() => del(m.id)}
                      disabled={busyDelete === m.id || m.id === "daily_streak"}
                      title={
                        m.id === "daily_streak"
                          ? "Protected — the app depends on this mission"
                          : "Delete"
                      }
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <MissionEditorModal
          initial={editing === "new" ? null : editing}
          authHeader={authHeader}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function MissionEditorModal({ initial, authHeader, onClose, onSaved }) {
  const isNew = !initial;
  const [form, setForm] = useState(
    initial ?? {
      id: "",
      type: "daily",
      title: "",
      description: "",
      category: "steps",
      target_value: 5000,
      xp_reward: 100,
      difficulty: "easy",
      should_show_in_home: false,
      poster_url: null,
      display_order: 100,
    },
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [posterBusy, setPosterBusy] = useState(false);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function onPosterFile(file) {
    if (!file) return;
    if (!form.id.trim()) {
      setErr("Set the mission id first — it's used to name the file.");
      return;
    }
    setPosterBusy(true);
    setErr("");
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch("/api/admin-mission-poster-upload", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: form.id.trim(),
          filename: file.name,
          contentType: file.type,
          dataBase64,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { publicUrl } = await res.json();
      update({ poster_url: publicUrl });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPosterBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/admin-missions-upsert", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <h3 className={styles.modalTitle}>
          {isNew ? "New mission" : `Edit ${initial.id}`}
        </h3>
        <p className={styles.modalSub}>
          {isNew
            ? "Publishes immediately to every device on next mission-catalog fetch."
            : "Changes apply on the next mission-catalog fetch (~seconds)."}
        </p>

        <div className={styles.formGrid}>
          <FormField label="Mission id" hint="lowercase / digits / underscores">
            <input
              className={styles.formInput}
              value={form.id}
              onChange={(e) => update({ id: e.target.value })}
              disabled={!isNew}
              placeholder="daily_arena"
            />
          </FormField>

          <FormField label="Type">
            <select
              className={styles.formInput}
              value={form.type}
              onChange={(e) => update({ type: e.target.value })}
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
            </select>
          </FormField>

          <FormField label="Title" full>
            <input
              className={styles.formInput}
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Walk 5,000 Steps"
            />
          </FormField>

          <FormField label="Description" full>
            <textarea
              className={styles.formInput}
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Hit your daily step target"
            />
          </FormField>

          <FormField label="Category">
            <select
              className={styles.formInput}
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="steps">steps</option>
              <option value="battle">battle</option>
              <option value="streak">streak</option>
              <option value="calories">calories</option>
            </select>
          </FormField>

          <FormField label="Difficulty">
            <select
              className={styles.formInput}
              value={form.difficulty}
              onChange={(e) => update({ difficulty: e.target.value })}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </FormField>

          <FormField label="Target value">
            <input
              type="number"
              className={styles.formInput}
              value={form.target_value}
              onChange={(e) => update({ target_value: e.target.value })}
              min={1}
            />
          </FormField>

          <FormField label="XP reward">
            <input
              type="number"
              className={styles.formInput}
              value={form.xp_reward}
              onChange={(e) => update({ xp_reward: e.target.value })}
              min={0}
            />
          </FormField>

          <FormField label="Display order" hint="higher = sorts first">
            <input
              type="number"
              className={styles.formInput}
              value={form.display_order}
              onChange={(e) => update({ display_order: e.target.value })}
            />
          </FormField>

          <FormField label="Featured on Home?" hint="shows as big card on Home">
            <div className={styles.toggleRow}>
              <button
                type="button"
                onClick={() =>
                  update({ should_show_in_home: !form.should_show_in_home })
                }
                className={`${styles.togglePillMini} ${
                  form.should_show_in_home ? styles.togglePillMiniOn : ""
                }`}
              >
                {form.should_show_in_home ? "On" : "Off"}
              </button>
            </div>
          </FormField>

          <FormField label="Poster image" full hint="PNG / JPG / WebP · up to 5 MB">
            <div className={styles.posterRow}>
              {form.poster_url ? (
                <img
                  src={form.poster_url}
                  alt=""
                  className={styles.posterPreview}
                />
              ) : (
                <div className={styles.posterEmpty}>
                  <ImageIcon size={22} />
                  <span>No poster</span>
                </div>
              )}
              <div className={styles.posterControls}>
                <label className={styles.posterUpload}>
                  {posterBusy ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={posterBusy}
                    onChange={(e) => onPosterFile(e.target.files?.[0])}
                  />
                </label>
                {form.poster_url && (
                  <button
                    type="button"
                    className={styles.modalGhost}
                    onClick={() => update({ poster_url: null })}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </FormField>
        </div>

        {err && <p className={styles.modalError}>{err}</p>}

        <div className={styles.modalActions}>
          <button className={styles.modalGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.modalPrimary}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : isNew ? "Create mission" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, hint, children, full }) {
  return (
    <div
      className={styles.formField}
      style={{ gridColumn: full ? "1 / -1" : undefined }}
    >
      <label className={styles.formLabel}>{label}</label>
      {children}
      {hint && <span className={styles.formHint}>{hint}</span>}
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      // strip "data:image/png;base64," prefix
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      className={`${styles.tabButton} ${active ? styles.tabButtonOn : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TierBadge({ tier, inline }) {
  const colors = {
    free: { bg: "rgba(148, 163, 184, 0.16)", fg: "#94a3b8" },
    pro: { bg: "rgba(59, 130, 246, 0.16)", fg: "#60a5fa" },
    family: { bg: "rgba(168, 85, 247, 0.18)", fg: "#c084fc" },
  }[tier ?? "free"] ?? { bg: "rgba(255,255,255,0.1)", fg: "white" };
  return (
    <span
      className={inline ? styles.tierPillInline : styles.tierPill}
      style={{ background: colors.bg, color: colors.fg }}
    >
      {tier}
    </span>
  );
}

function StatusPill({ status }) {
  const colors = {
    success: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80" },
    failed: { bg: "rgba(239, 68, 68, 0.15)", fg: "#f87171" },
    pending: { bg: "rgba(251, 191, 36, 0.16)", fg: "#fbbf24" },
    refunded: { bg: "rgba(148, 163, 184, 0.18)", fg: "#cbd5e1" },
  }[status] ?? { bg: "rgba(255,255,255,0.08)", fg: "white" };
  return (
    <span
      className={styles.tierPill}
      style={{ background: colors.bg, color: colors.fg }}
    >
      {status}
    </span>
  );
}

function SignOutButton() {
  return (
    <button
      className={styles.signOut}
      onClick={() => supabase.auth.signOut()}
    >
      <LogOut size={13} />
      Sign out
    </button>
  );
}

function FullscreenMessage({ children, tone }) {
  return (
    <main className={styles.fullscreen}>
      <div
        className={`${styles.fullscreenCard} ${
          tone === "error" ? styles.fullscreenError : ""
        }`}
      >
        {children}
      </div>
    </main>
  );
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
