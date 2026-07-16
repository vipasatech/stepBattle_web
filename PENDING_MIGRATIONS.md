# Pending Supabase Migrations

Chunks to run in the Supabase SQL Editor (one at a time, in order).
Each chunk is idempotent — safe to re-run.

---

## Migration 0031 — admin_activity_log

Audit trail for every admin action (tier flips, refunds, expiry
extensions). Written by the /api/admin-* endpoints on the website;
read by the /admin panel's Activity Log tab.

### Chunk 1 — table

```sql
create table if not exists public.admin_activity_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid references public.profiles(id) on delete set null,
  action         text not null,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

create index if not exists admin_activity_log_admin_id_idx
  on public.admin_activity_log (admin_id);

create index if not exists admin_activity_log_target_user_id_idx
  on public.admin_activity_log (target_user_id);
```

### Chunk 2 — RLS

Only admins can read. Writes happen exclusively through the
service_role from serverless functions (bypasses RLS anyway),
so no INSERT policy is needed for regular users.

```sql
alter table public.admin_activity_log enable row level security;

drop policy if exists "admins read admin_activity_log"
  on public.admin_activity_log;

create policy "admins read admin_activity_log"
  on public.admin_activity_log
  for select
  using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );
```

### Chunk 3 — refund columns on subscription_orders

The admin refund API writes to two additive columns. Existing rows
default to NULL — the current webhook path never touches them.

```sql
alter table public.subscription_orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_id   text;

comment on column public.subscription_orders.refunded_at is
  'When admin-refund.js issued the Razorpay refund; also implies status = ''refunded''.';
comment on column public.subscription_orders.refund_id is
  'Razorpay refund entity id (rfnd_XXXX). Null unless refunded.';
```

### Chunk 4 — missions extras + mission-posters storage bucket

Idempotent — safe if these columns / bucket already exist. The
mobile app already reads `should_show_in_home`, `poster_url`,
`display_order` from missions rows; the admin panel writes them.

```sql
alter table public.missions
  add column if not exists should_show_in_home boolean not null default false,
  add column if not exists poster_url          text,
  add column if not exists display_order       integer not null default 100;

create index if not exists missions_display_order_idx
  on public.missions (display_order desc);
```

Public storage bucket for admin-uploaded mission posters. Reads are
public (bucket is public), writes go through the /api/admin-mission-poster-upload
endpoint using the service_role client — so no INSERT/UPDATE policies
are needed here.

```sql
insert into storage.buckets (id, name, public)
values ('mission-posters', 'mission-posters', true)
on conflict (id) do nothing;

-- Explicit read policy in case the storage.objects table has RLS on
-- but public buckets aren't honored (defensive; noop on modern Supabase).
drop policy if exists "mission-posters public read"
  on storage.objects;
create policy "mission-posters public read"
  on storage.objects for select
  using (bucket_id = 'mission-posters');
```

### Chunk 5 — helper view

Denormalized view the Activity Log tab reads from directly. Joins
in the admin's + target user's email/name so the client doesn't
need a second query per row.

```sql
create or replace view public.admin_activity_log_expanded as
select
  l.id,
  l.action,
  l.details,
  l.created_at,
  l.admin_id,
  a.email          as admin_email,
  a.preferred_name as admin_name,
  l.target_user_id,
  t.email          as target_email,
  t.preferred_name as target_name
from public.admin_activity_log l
left join public.profiles a on a.id = l.admin_id
left join public.profiles t on t.id = l.target_user_id;

grant select on public.admin_activity_log_expanded to authenticated;
```
