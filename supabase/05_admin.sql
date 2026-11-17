-- =====================================================================
-- AL-MAHATTA | ملف 05: دعم موقع الإدارة (الموظفون، العمولات، الإحصائيات)
-- شغّله مرة واحدة بعد الملفات 01–04. آمن لإعادة التشغيل.
-- =====================================================================

-- بريد العميل في الملف الشخصي (للعرض في الإدارة)
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

-- الموظفون
create table if not exists public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'staff' check (role in ('admin','staff')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

-- مدير عام (is_admin في profiles أو موظف بدور admin) / أي موظف نشط
create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
      or exists (select 1 from public.staff where user_id = auth.uid() and active and role = 'admin');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super()
      or exists (select 1 from public.staff where user_id = auth.uid() and active);
$$;

drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff for select to authenticated using (public.is_admin());
drop policy if exists staff_super on public.staff;
create policy staff_super on public.staff for all to authenticated using (public.is_super()) with check (public.is_super());

-- نسب عمولة المحطة لكل مكتب
create table if not exists public.commission_rates (
  office_slug text primary key references public.offices(slug) on update cascade on delete cascade,
  rate        numeric(5,2) not null default 10 check (rate between 0 and 100)
);
alter table public.commission_rates enable row level security;
drop policy if exists rates_select on public.commission_rates;
create policy rates_select on public.commission_rates for select to authenticated using (public.is_admin());
drop policy if exists rates_super on public.commission_rates;
create policy rates_super on public.commission_rates for all to authenticated using (public.is_super()) with check (public.is_super());
insert into public.commission_rates (office_slug)
select slug from public.offices on conflict do nothing;

-- إعدادات التطبيق يعدّلها المدير العام فقط
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_super()) with check (public.is_super());

-- عند إلغاء حجز (من الإدارة) تُحرَّر مقاعده
create or replace function public.release_seats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    delete from public.booking_seats where booking_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists trg_release_seats on public.bookings;
create trigger trg_release_seats after update of status on public.bookings
  for each row execute function public.release_seats();

-- إحصائيات لوحة التحكم
create or replace function public.admin_stats(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  f timestamptz := coalesce(p_from, '-infinity');
  t timestamptz := coalesce(p_to, 'infinity');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'offices',   (select count(*) from public.offices where active),
    'bookings',  (select count(*) from public.bookings where created_at between f and t),
    'new_requests',
        (select count(*) from public.bookings where status in ('pending','payment_review'))
      + (select count(*) from public.shipments where status = 'received')
      + (select count(*) from public.transfers where status = 'pending')
      + (select count(*) from public.security_requests where status = 'pending')
      + (select count(*) from public.property_requests where status = 'pending')
      + (select count(*) from public.service_requests where status = 'pending'),
    'counts', jsonb_build_object(
      'bookings',  (select count(*) from public.bookings where created_at between f and t),
      'shipments', (select count(*) from public.shipments where created_at between f and t),
      'transfers', (select count(*) from public.transfers where created_at between f and t),
      'security',  (select count(*) from public.security_requests where created_at between f and t),
      'property',  (select count(*) from public.property_requests where created_at between f and t),
      'services',  (select count(*) from public.service_requests where created_at between f and t)),
    'revenue', jsonb_build_object(
      'travel',    (select coalesce(sum(total),0) from public.bookings  where status = 'confirmed' and created_at between f and t),
      'parcels',   (select coalesce(sum(cost),0)  from public.shipments where status <> 'cancelled' and created_at between f and t),
      'transfers', (select coalesce(sum(fee),0)   from public.transfers where status = 'completed' and created_at between f and t)),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (
      select g::date as d,
             (select count(*) from public.bookings  where created_at::date = g::date)
           + (select count(*) from public.shipments where created_at::date = g::date)
           + (select count(*) from public.transfers where created_at::date = g::date) as n
      from generate_series(current_date - 13, current_date, interval '1 day') g) x)
  );
end $$;

-- إضافة موظف بالبريد (للمدير العام فقط؛ يجب أن يكون للشخص حساب في التطبيق)
create or replace function public.admin_add_staff(p_email text, p_role text default 'staff')
returns void language plpgsql security definer set search_path = public as $$
declare u record;
begin
  if not public.is_super() then raise exception 'forbidden'; end if;
  if p_role not in ('admin','staff') then raise exception 'bad_role'; end if;
  select id, email into u from auth.users where lower(email) = lower(trim(p_email));
  if not found then raise exception 'user_not_found'; end if;
  insert into public.staff (user_id, full_name, email, role)
  values (u.id, (select full_name from public.profiles where id = u.id), u.email, p_role)
  on conflict (user_id) do update set role = excluded.role, active = true;
end $$;

-- إرسال إشعار لعميل
create or replace function public.admin_notify(p_user uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into public.notifications (user_id, title, body) values (p_user, p_title, p_body);
end $$;

grant execute on function public.is_super()                       to authenticated;
grant execute on function public.admin_stats(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_add_staff(text, text)      to authenticated;
grant execute on function public.admin_notify(uuid, text, text)   to authenticated;
