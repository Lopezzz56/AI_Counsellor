-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  academic_background jsonb,
  study_goal jsonb,
  budget jsonb,
  exam_readiness jsonb,
  onboarding_completed boolean default false,
  current_stage text default 'building_profile',
  created_at timestamptz default now()
);

-- Create tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  status text default 'pending', -- 'pending', 'completed'
  created_by text default 'ai', -- 'ai', 'user'
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table tasks enable row level security;

-- Policies for profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Policies for tasks
create policy "Users can view own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "Users can update own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "Users can insert own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own tasks" on tasks
  for delete using (auth.uid() = user_id);

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
