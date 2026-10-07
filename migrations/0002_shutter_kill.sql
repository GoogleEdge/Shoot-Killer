-- 快门杀 · phone-camera elimination match
create table if not exists players (
  id          serial primary key,
  name        text not null unique,
  team        text not null default 'steel',
  status      text not null default 'alive',
  created_at  timestamptz not null default now()
);

create table if not exists shots (
  id            serial primary key,
  shooter_name  text not null,
  target_name   text not null,
  image_data    text not null,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create table if not exists game_meta (
  id          integer primary key default 1,
  status      text not null default 'live',
  started_at  timestamptz not null default now()
);

insert into game_meta (id, status) values (1, 'live')
  on conflict (id) do nothing;

create index if not exists shots_status_idx on shots (status, created_at desc);
create index if not exists shots_target_idx on shots (target_name);
create index if not exists players_status_idx on players (status);
