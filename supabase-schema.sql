-- Contacts / Pipeline
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  source text default 'Instagram',
  type text default 'kunde',
  stage text default 'neu',
  notes text,
  created_at timestamp with time zone default now(),
  last_contact date default current_date
);

-- Outreach Einträge
create table if not exists outreach (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  channel text default 'instagram',
  status text default 'gesendet',
  message text,
  created_at timestamp with time zone default now()
);

-- Geschäftspartner
create table if not exists partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  level text default 'Junior',
  termine integer default 0,
  abschluesse integer default 0,
  status text default 'neu',
  notes text,
  join_date date default current_date,
  created_at timestamp with time zone default now()
);

-- Row Level Security ausschalten für lokale Entwicklung
alter table contacts disable row level security;
alter table outreach disable row level security;
alter table partners disable row level security;
