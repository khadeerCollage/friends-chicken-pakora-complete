-- ============================================================================
-- Friends Chicken Pakoda / Riyan Fast Foods — Master Supabase Cloud Schema
-- Single Master Stock Items (Weight in Kg / Count in Pieces / Plates)
-- ============================================================================

-- 1. Master Menu Items Catalog
create table if not exists public.menu_items (
    id text primary key,
    name text not null,
    category text not null default 'Chicken', 
    unit text not null check (unit in ('kg', 'grams', 'pieces', 'plates', 'eggs')),
    price numeric(10,2) not null,              
    price_note text,
    is_active boolean default true,
    sort_order integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Daily Closings Summary (With Chicken Intake & Cuts)
create table if not exists public.daily_closings (
    id text primary key,
    closing_date date unique not null default current_date,
    total_expected_sales numeric(12,2) default 0,
    actual_cash_collected numeric(12,2) default 0,
    actual_upi_collected numeric(12,2) default 0,
    total_revenue numeric(12,2) default 0,
    total_expenses numeric(12,2) default 0,
    net_profit numeric(12,2) default 0,
    cash_difference numeric(12,2) default 0, 
    master_wage numeric(10,2) default 0,
    raw_chicken_intake_kg numeric(10,3) default 0,
    raw_pakora_meat_kg numeric(10,3) default 0,
    wings_pieces integer default 0,
    wings_weight numeric(10,3) default 0,
    full_joint_pieces integer default 0,
    full_joint_weight numeric(10,3) default 0,
    half_joint_pieces integer default 0,
    half_joint_weight numeric(10,3) default 0,
    liver_val numeric(10,3) default 0,
    notes text,
    is_closed boolean default false,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Daily Stock Line Entries
create table if not exists public.daily_stock_entries (
    id uuid primary key default gen_random_uuid(),
    closing_id text references public.daily_closings(id) on delete cascade,
    item_id text references public.menu_items(id) on delete cascade,
    entry_date date not null default current_date,
    item_name text not null,
    unit text not null default 'kg',
    opening_val numeric(10,3) default 0,
    opening_unit text default 'kg',
    opening_stock numeric(10,3) default 0,        
    added_val numeric(10,3) default 0,
    added_unit text default 'kg',
    marinated_added_stock numeric(10,3) default 0,
    closing_val numeric(10,3) default 0,
    closing_unit text default 'kg',
    closing_stock numeric(10,3) default 0,        
    sold_quantity numeric(10,3) default 0,        
    unit_price numeric(10,2) not null,            
    total_sales numeric(12,2) default 0,          
    batches jsonb default '[]'::jsonb,
    notes text,
    created_at timestamptz not null default now(),
    constraint unique_daily_item unique (entry_date, item_id)
);

-- 4. Expenses Table
create table if not exists public.expenses (
    id text primary key,
    expense_date date not null default current_date,
    category text not null,                       
    amount numeric(12,2) not null check(amount > 0),
    quantity text,                                
    payment_method text not null check(payment_method in ('Cash', 'UPI', 'Bank', 'Other')),
    paid_to text,
    description text,
    created_at timestamptz not null default now()
);

-- 5. General Transactions 
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    type text not null check(type in ('income','expense')),
    category text not null,
    amount numeric(12,2) not null check(amount > 0),
    payment_method text not null check(payment_method in ('Cash','UPI','Bank','Other')),
    transaction_date date not null default current_date,
    description text,
    note text,
    created_at timestamptz not null default now()
);

-- Indexes for lightning fast queries
create index if not exists menu_items_active_idx on public.menu_items(is_active, sort_order);
create index if not exists daily_closings_date_idx on public.daily_closings(closing_date desc);
create index if not exists daily_stock_date_idx on public.daily_stock_entries(entry_date desc);
create index if not exists expenses_date_idx on public.expenses(expense_date desc);
create index if not exists transactions_date_idx on public.transactions(transaction_date desc);

-- Enable RLS and public policies for seamless anonymous web app operations
alter table public.menu_items enable row level security;
alter table public.daily_closings enable row level security;
alter table public.daily_stock_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "anon access menu_items" on public.menu_items;
create policy "anon access menu_items" on public.menu_items for all to anon using(true) with check(true);

drop policy if exists "anon access daily_closings" on public.daily_closings;
create policy "anon access daily_closings" on public.daily_closings for all to anon using(true) with check(true);

drop policy if exists "anon access daily_stock_entries" on public.daily_stock_entries;
create policy "anon access daily_stock_entries" on public.daily_stock_entries for all to anon using(true) with check(true);

drop policy if exists "anon access expenses" on public.expenses;
create policy "anon access expenses" on public.expenses for all to anon using(true) with check(true);

drop policy if exists "anon access transactions" on public.transactions;
create policy "anon access transactions" on public.transactions for all to anon using(true) with check(true);

-- Enable Realtime publication
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.daily_closings;
alter publication supabase_realtime add table public.daily_stock_entries;
alter publication supabase_realtime add table public.expenses;

-- ============================================================================
-- Seed Unified Master Menu Items Catalog
-- ============================================================================
insert into public.menu_items (id, name, category, unit, price, price_note, sort_order)
values
  ('item-chicken-pokodi', 'Chicken Pakora', 'Chicken', 'kg', 480, '100g: ₹60 | 250g: ₹120 | 1kg: ₹480', 1),
  ('item-chicken-liver', 'Chicken Liver Pakora', 'Chicken', 'kg', 400, '100g: ₹50 | 250g: ₹100', 2),
  ('item-chicken-wings', 'Chicken Wings', 'Chicken', 'pieces', 20, '₹20 / piece', 3),
  ('item-chicken-full-joint', 'Chicken Full Joint (Leg Piece)', 'Chicken', 'pieces', 100, '₹100 / piece', 4),
  ('item-chicken-half-joint', 'Chicken Half Joint', 'Chicken', 'pieces', 50, '₹50 / piece', 5),
  ('item-fish-fry', 'Fish Fry', 'Fish', 'pieces', 40, '₹40 / piece', 6),
  ('item-fish-head', 'Fish Head (Talakaya)', 'Fish', 'pieces', 70, '₹70 / piece', 7),
  ('item-chilli-chicken', 'Chilli Chicken', 'Chicken', 'plates', 120, '₹120 / plate', 8),
  ('item-chicken-manchuria', 'Chicken Manchuria', 'Chicken', 'plates', 80, '₹80 / plate', 9),
  ('item-veg-manchuria-plate', 'Veg Manchuria (Plate)', 'Veg/FastFood', 'plates', 60, '₹60 / plate', 10),
  ('item-veg-manchuria-fry', 'Veg Manchuria (Fry)', 'Veg/FastFood', 'plates', 70, '₹70 / plate', 11),
  ('item-eggs-stock', 'Eggs (All Egg Items / Omelettes / Boiled)', 'Egg', 'eggs', 20, '₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)', 12)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  unit = excluded.unit,
  price = excluded.price,
  price_note = excluded.price_note,
  sort_order = excluded.sort_order;
