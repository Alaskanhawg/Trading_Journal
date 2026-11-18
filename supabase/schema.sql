begin;

create table public.journal_trades (
  id uuid primary key default gen_random_uuid(),
  traded_on date not null,
  created_at timestamptz not null default now(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text not null default '' check (char_length(notes) <= 10000),
  side text not null check (side in ('long', 'short')),
  outcome text check (outcome in ('win', 'loss')),
  chart text not null
);

create table public.journal_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references auth.users(id)
);

revoke all on public.journal_owner from anon, authenticated;
alter table public.journal_owner enable row level security;

create function public.is_journal_owner() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.journal_owner where user_id = auth.uid())
$$;

revoke all on function public.is_journal_owner() from public;
grant execute on function public.is_journal_owner() to authenticated;
alter table public.journal_trades enable row level security;
revoke all on public.journal_trades from anon, authenticated;
grant select on public.journal_trades to anon, authenticated;
grant insert, update on public.journal_trades to authenticated;

create policy "Anyone can read trades" on public.journal_trades for select using (true);
create policy "Owner can add trades" on public.journal_trades for insert to authenticated
  with check ((select public.is_journal_owner()));
create policy "Owner can edit trades" on public.journal_trades for update to authenticated
  using ((select public.is_journal_owner())) with check ((select public.is_journal_owner()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-charts', 'trade-charts', true, 10485760, array['image/png','image/jpeg','image/webp']);

create policy "Owner can upload charts" on storage.objects for insert to authenticated
  with check (bucket_id = 'trade-charts' and (select public.is_journal_owner()));
create policy "Owner can list charts" on storage.objects for select to authenticated
  using (bucket_id = 'trade-charts' and (select public.is_journal_owner()));

insert into public.journal_trades (traded_on, created_at, title, notes, side, outcome, chart) values
('2026-11-18', '2026-11-18 14:49:24+00', 'MNQ · Quantum candle retest',
 E'A candle closed below the level marked by the blue Quantum candle on the left. I set my short entry at that level for the retest and aimed for a 1:1 reward-to-risk target.\n\nI use the candle that breaks the level to set my stop, whether the break is up or down.',
 'short', 'win', 'screenshots/MNQ1%21_2026-11-18_08-49-24_adc91.png'),
('2026-11-18', '2026-11-18 14:54:38+00', 'MNQ · Second Quantum candle short',
 'A candle closed below the blue Quantum candle on the left. I took the short, and it was a win.',
 'short', 'win', 'screenshots/MNQ1%21_2026-11-18_08-54-38_779a5.png');

commit;
