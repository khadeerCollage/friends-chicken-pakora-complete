create table if not exists public.transactions(
id uuid primary key default gen_random_uuid(),
type text not null check(type in ('income','expense')),
amount numeric(12,2) not null check(amount>0),
category text not null,
description text,
payment_method text not null check(payment_method in ('Cash','UPI','Bank','Other')),
transaction_date date not null default current_date,
note text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on public.transactions(transaction_date desc);
create index if not exists transactions_type_idx on public.transactions(type);
alter table public.transactions enable row level security;
drop policy if exists "anon full access (MVP - no auth yet)" on public.transactions;
create policy "anon full access (MVP - no auth yet)" on public.transactions for all to anon using(true) with check(true);
alter publication supabase_realtime add table public.transactions;
