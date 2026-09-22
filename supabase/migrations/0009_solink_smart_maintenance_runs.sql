-- ============================================================================
-- Solink — Smart Maintenance Agent runs (2026-09-22)
--
-- One row per run of the Smart Maintenance Agent. The row's `id` is the
-- run_id the Agent and, later, n8n refer to. This migration is the database
-- foundation only: no agent logic, thresholds, decisions, triggers or
-- notifications live here. The Agent (implemented separately) moves `status`
-- and writes `decision`; the downstream workflow writes the `n8n_*` columns.
--
-- Conventions followed from 0001–0008: uuid primary keys, timestamptz, `set_updated_at()` trigger, RLS with the helpers in the
-- `private` schema, no `using (true)` policy.
-- ============================================================================

-- UPPERCASE, unlike every other Solink enum: the owner's brief to the Agent
-- session names the values this way (2026-09-22), and the two must agree.
-- Applied first in lowercase, then renamed in place the same day while the
-- table was still empty; this file shows the end state.
create type smart_maintenance_run_status as enum (
  'PENDING', 'RUNNING', 'DECISION_READY', 'AWAITING_APPROVAL',
  'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED'
);
create type smart_maintenance_decision as enum ('NORMAL', 'INVESTIGATE', 'MAINTENANCE_RECOMMENDED');
create type smart_maintenance_approval as enum ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

create table smart_maintenance_runs (
  id uuid primary key default gen_random_uuid(),               -- the run_id
  user_id uuid not null references auth.users(id) on delete cascade,       -- the homeowner the run is for
  system_id uuid not null references solar_systems(id) on delete cascade,  -- the system analysed

  status smart_maintenance_run_status not null default 'PENDING',
  decision smart_maintenance_decision,                          -- null until the Agent decides

  -- Production the Agent compared. kWh over the analysis window; percent =
  -- (actual − expected) / expected × 100, so a shortfall is negative.
  actual_production numeric,
  expected_production numeric,
  production_difference_percent numeric,
  analysis_window jsonb not null default '{}',                  -- e.g. {"from": ISO, "to": ISO, "days": 30}

  weather_data jsonb not null default '{}',                     -- what the Agent was given (auditability)
  maintenance_history jsonb not null default '[]',
  evidence jsonb not null default '[]',                         -- observations the decision rests on

  agent_reason text,                                            -- the Agent's explanation, in words
  recommended_action text,

  requires_approval boolean not null default false,
  approval_status smart_maintenance_approval not null default 'NOT_REQUIRED',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,

  n8n_triggered_at timestamptz,
  n8n_execution_id text,
  n8n_result jsonb,

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create trigger trg_smart_maintenance_runs_updated before update on smart_maintenance_runs for each row execute function set_updated_at();

create index smart_maintenance_runs_system_idx on smart_maintenance_runs (system_id, created_at desc);
create index smart_maintenance_runs_user_idx on smart_maintenance_runs (user_id, created_at desc);
-- Open work only: the Agent and the workflow poll for runs still in flight.
create index smart_maintenance_runs_open_idx on smart_maintenance_runs (status) where status not in ('COMPLETED', 'FAILED', 'REJECTED');

-- ----------------------------------------------------------------------------
-- Row level security: the homeowner sees and manages runs on their own
-- systems; admins see all. Nothing is readable by everyone. Writes from the
-- workflow (n8n) use the service role, which bypasses RLS, as production
-- ingestion already does.
-- ----------------------------------------------------------------------------
alter table smart_maintenance_runs enable row level security;

create policy "smart runs owner select" on smart_maintenance_runs for select
  using (user_id = auth.uid());
create policy "smart runs owner insert" on smart_maintenance_runs for insert
  with check (user_id = auth.uid() and private.owns_system(system_id));
create policy "smart runs owner update" on smart_maintenance_runs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and private.owns_system(system_id));
create policy "smart runs admin" on smart_maintenance_runs for all
  using (private.is_admin()) with check (private.is_admin());
