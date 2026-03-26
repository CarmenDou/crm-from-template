create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  full_name text not null,
  company text,
  email text,
  phone text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_owner_id_idx on public.leads(owner_id);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  value numeric(12,2) not null default 0,
  stage text not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_owner_id_idx on public.deals(owner_id);
create index if not exists deals_stage_idx on public.deals(stage);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  deal_id uuid references public.deals(id) on delete cascade,
  title text not null,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_owner_id_idx on public.tasks(owner_id);
create index if not exists tasks_deal_id_idx on public.tasks(deal_id);

