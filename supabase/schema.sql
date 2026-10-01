create table if not exists public.contest_rooms (
 code text primary key,
 state jsonb not null,
 revision bigint not null default 0,
 created_at timestamptz not null default now()
);
alter table public.contest_rooms enable row level security;
revoke all on public.contest_rooms from anon, authenticated;
grant all on public.contest_rooms to service_role;
create or replace function public.contest_compare_swap(p_code text,p_revision bigint,p_state jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 update public.contest_rooms set state=p_state,revision=revision+1 where code=p_code and revision=p_revision;
 return found;
end;
$$;
revoke all on function public.contest_compare_swap(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.contest_compare_swap(text,bigint,jsonb) to service_role;
