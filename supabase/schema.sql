-- Autocross Designer 2: Courses table
-- Run this in the Supabase SQL editor to set up the database

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  creator_token text not null,
  title text not null default 'Untitled Course',
  data jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing courses by creator
create index if not exists idx_courses_creator on courses (creator_token, updated_at desc);

-- Index for public course lookups
create index if not exists idx_courses_public on courses (is_public, updated_at desc);

-- Row Level Security
alter table courses enable row level security;

-- Anyone can read public courses
create policy "Public courses are readable by anyone"
  on courses for select
  using (is_public = true);

-- Creator can read all their own courses (including private)
create policy "Creators can read own courses"
  on courses for select
  using (creator_token = current_setting('request.headers')::json->>'x-creator-token');

-- Creator can insert their own courses
create policy "Creators can insert own courses"
  on courses for insert
  with check (creator_token = current_setting('request.headers')::json->>'x-creator-token');

-- Creator can update their own courses
create policy "Creators can update own courses"
  on courses for update
  using (creator_token = current_setting('request.headers')::json->>'x-creator-token');

-- Creator can delete their own courses
create policy "Creators can delete own courses"
  on courses for delete
  using (creator_token = current_setting('request.headers')::json->>'x-creator-token');

-- Auto-update updated_at on changes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger courses_updated_at
  before update on courses
  for each row execute function update_updated_at();
