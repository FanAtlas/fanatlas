create table if not exists profiles (
  id uuid primary key,
  email text unique,
  name text,
  country text,
  favorite_team text,
  language text default 'en',
  membership_type text default 'free',
  created_at timestamp with time zone default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  team1 text,
  team2 text,
  stadium text,
  city text,
  match_date text,
  status text,
  weather text,
  fan_zone_id uuid,
  created_at timestamp with time zone default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text,
  category text,
  city text,
  latitude double precision,
  longitude double precision,
  rating numeric,
  busy_level text,
  safety_score integer,
  image text,
  description text,
  created_at timestamp with time zone default now()
);

create table if not exists fan_zones (
  id uuid primary key default gen_random_uuid(),
  name text,
  city text,
  capacity integer,
  latitude double precision,
  longitude double precision,
  description text,
  opening_hours text,
  safety_score integer,
  family_friendly boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists emergency_services (
  id uuid primary key default gen_random_uuid(),
  name text,
  category text,
  city text,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  severity text,
  city text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists travel_guides (
  id uuid primary key default gen_random_uuid(),
  title text,
  country text,
  city text,
  phase text,
  category text,
  content text,
  created_at timestamp with time zone default now()
);
