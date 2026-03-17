-- =============================================
-- 교독 앱 Supabase 테이블 스키마
-- Supabase 콘솔 → SQL Editor 에 전체 붙여넣고 실행
-- =============================================

-- 1. 사용자
create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  code          text not null,
  is_admin      boolean default false,
  profile_image text,
  phone         text,
  address       text,
  address_detail text,
  delivery_memo text,
  created_at    timestamptz default now()
);

-- 2. 교독 모임
create table gyodoks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  status          text default 'upcoming' check (status in ('active','completed','upcoming')),
  start_date      date,
  end_date        date,
  participant_ids uuid[] default '{}',
  editable_ids    uuid[] default '{}',
  book_covers     text[] default '{}',
  created_by      uuid references users(id),
  created_at      timestamptz default now()
);

-- 3. 중간 점검 일정
create table checkpoints (
  id          uuid primary key default gen_random_uuid(),
  gyodok_id   uuid references gyodoks(id) on delete cascade,
  round       int not null,
  type        text check (type in ('checkin','send')),
  label       text,
  date        date,
  created_at  timestamptz default now()
);

-- 4. 책
create table books (
  id             uuid primary key default gen_random_uuid(),
  gyodok_id      uuid references gyodoks(id) on delete cascade,
  owner_id       uuid references users(id),
  round          int not null,
  exchange_order uuid[] default '{}',
  isbn           text,
  title          text,
  author         text,
  publisher      text,
  publish_date   text,
  cover_url      text,
  description    text,
  price          int default 0,
  registered_at  timestamptz default now()
);

-- 5. 책 상태 (참여자별)
create table book_statuses (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references books(id) on delete cascade,
  gyodok_id   uuid references gyodoks(id) on delete cascade,
  user_id     uuid references users(id),
  is_read     boolean default false,
  is_sent     boolean default false,
  is_arrived  boolean default false,
  read_at     timestamptz,
  sent_at     timestamptz,
  arrived_at  timestamptz,
  updated_at  timestamptz default now(),
  unique (book_id, user_id)
);

-- 6. 위시리스트
create table wishlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  isbn        text,
  title       text,
  author      text,
  publisher   text,
  cover_url   text,
  added_at    timestamptz default now()
);

-- 7. 피드
create table feed (
  id          uuid primary key default gen_random_uuid(),
  gyodok_id   uuid references gyodoks(id) on delete cascade,
  user_id     uuid references users(id),
  user_name   text,
  type        text check (type in ('read','sent','arrived','registered')),
  book_title  text,
  created_at  timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security) 설정
-- 현재 앱은 커스텀 로그인(이름+코드)이므로 anon key로 접근
-- 운영 전 필요 시 정책 강화 가능
-- =============================================
alter table users        enable row level security;
alter table gyodoks      enable row level security;
alter table checkpoints  enable row level security;
alter table books        enable row level security;
alter table book_statuses enable row level security;
alter table wishlist     enable row level security;
alter table feed         enable row level security;

-- anon 키로 전체 읽기/쓰기 허용 (소규모 지인 앱 기준)
create policy "allow all" on users        for all using (true) with check (true);
create policy "allow all" on gyodoks      for all using (true) with check (true);
create policy "allow all" on checkpoints  for all using (true) with check (true);
create policy "allow all" on books        for all using (true) with check (true);
create policy "allow all" on book_statuses for all using (true) with check (true);
create policy "allow all" on wishlist     for all using (true) with check (true);
create policy "allow all" on feed         for all using (true) with check (true);

-- =============================================
-- Storage 버킷 생성 (프로필 사진용)
-- SQL Editor에서 실행
-- =============================================
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true);

create policy "allow all" on storage.objects
  for all using (bucket_id = 'profiles') with check (bucket_id = 'profiles');
