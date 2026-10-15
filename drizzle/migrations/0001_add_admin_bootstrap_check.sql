create or replace function public.has_any_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where role = 'admin'
  )
$$;

grant execute on function public.has_any_admin() to authenticated;