create extension if not exists pgcrypto;

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_state enable row level security;

drop policy if exists "Users can read their own app state" on public.app_state;
create policy "Users can read their own app state"
on public.app_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own app state" on public.app_state;
create policy "Users can insert their own app state"
on public.app_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own app state" on public.app_state;
create policy "Users can update their own app state"
on public.app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
