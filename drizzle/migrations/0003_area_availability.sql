-- Area-based availability, like quick-commerce apps: each seller delivers to a set of Bangalore
-- areas, and shoppers only see (and can only order) plants delivered to their area.
-- Roots' own greenhouse stock has no list (null) and is delivered to every launch area.
-- Written to be safe to re-run.

alter table public.vendors add column if not exists service_areas text[] not null default '{}';
alter table public.plants add column if not exists service_areas text[];

-- Vendors: status stays admin-controlled; an empty delivery list defaults to the vendor's own area.
create or replace function public.guard_vendor_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(cardinality(new.service_areas), 0) = 0 then
    new.service_areas := array[new.locality];
  end if;
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.review_note := '';
  else
    new.status := case when old.status = 'rejected' then 'pending' else old.status end;
    new.review_note := old.review_note;
  end if;
  return new;
end;
$$;

-- Vendor listings carry the vendor's name and delivery areas; vendor edits go back to review.
create or replace function public.guard_plant_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vendor_id is not null then
    select business_name, service_areas into new.vendor_name, new.service_areas
    from public.vendors where user_id = new.vendor_id;
  end if;
  if auth.uid() is null
    or public.has_role(auth.uid(), 'admin')
    or current_setting('roots.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.vendor_id is distinct from auth.uid() then
    raise exception 'You can only manage your own listings';
  end if;
  new.status := 'pending';
  new.review_note := '';
  new.active := true;
  return new;
end;
$$;

-- Keep listings in step when a vendor renames their business or changes delivery areas
-- (without sending the listings back to review).
create or replace function public.sync_vendor_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.business_name is distinct from old.business_name
    or new.service_areas is distinct from old.service_areas then
    perform set_config('roots.trusted_write', 'on', true);
    update public.plants
      set vendor_name = new.business_name, service_areas = new.service_areas
      where vendor_id = new.user_id;
    perform set_config('roots.trusted_write', 'off', true);
  end if;
  return new;
end;
$$;

-- Backfill existing vendors and their listings.
update public.vendors set service_areas = array[locality] where cardinality(service_areas) = 0;
do $$
begin
  perform set_config('roots.trusted_write', 'on', true);
  update public.plants p
    set service_areas = v.service_areas
    from public.vendors v
    where p.vendor_id = v.user_id and p.service_areas is distinct from v.service_areas;
  perform set_config('roots.trusted_write', 'off', true);
end $$;

-- Orders: every item must be delivered to the order's area.
create or replace function public.place_order(
  p_items jsonb,
  p_contact_name text,
  p_phone text,
  p_address text,
  p_locality text,
  p_pincode text,
  p_notes text,
  p_payment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_plant public.plants%rowtype;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_fee numeric(10,2);
begin
  if v_uid is null then
    raise exception 'Please sign in to place an order';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty';
  end if;
  if length(trim(coalesce(p_contact_name, ''))) < 2 then
    raise exception 'Please enter the name for delivery';
  end if;
  if length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Please enter your full delivery address';
  end if;
  if length(trim(coalesce(p_locality, ''))) = 0 then
    raise exception 'Please choose your area';
  end if;
  if coalesce(p_phone, '') !~ '^[6-9][0-9]{9}$' then
    raise exception 'Please enter a 10-digit Indian mobile number';
  end if;
  if coalesce(p_pincode, '') !~ '^560[0-9]{3}$' then
    raise exception 'We deliver within Bangalore only for now (PIN codes starting with 560)';
  end if;
  if coalesce(p_payment, '') not in ('cod', 'upi_on_delivery') then
    raise exception 'Please choose a payment method';
  end if;

  perform set_config('roots.trusted_write', 'on', true);

  insert into public.orders (
    user_id, contact_name, phone, address_line, locality, pincode, delivery_notes, payment_method
  ) values (
    v_uid, trim(p_contact_name), p_phone, trim(p_address), p_locality, p_pincode,
    coalesce(trim(p_notes), ''), p_payment
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Quantities must be between 1 and 20';
    end if;

    select * into v_plant
    from public.plants
    where id = (v_item->>'plant_id')::uuid
      and active and status = 'approved'
      and (vendor_id is null or public.vendor_is_approved(vendor_id))
    for update;
    if not found then
      raise exception 'One of the plants in your bag is no longer available';
    end if;
    if v_plant.service_areas is not null and not (p_locality = any(v_plant.service_areas)) then
      raise exception '% isn''t delivered to % yet', v_plant.name, p_locality;
    end if;
    if v_plant.stock < v_qty then
      raise exception '% has only % left in stock', v_plant.name, v_plant.stock;
    end if;

    update public.plants set stock = stock - v_qty where id = v_plant.id;
    insert into public.order_items (order_id, plant_id, vendor_id, name, unit_price, quantity)
    values (v_order_id, v_plant.id, v_plant.vendor_id, v_plant.name, v_plant.price, v_qty);
    v_subtotal := v_subtotal + v_plant.price * v_qty;
  end loop;

  v_fee := case when v_subtotal >= 999 then 0 else 99 end;
  update public.orders
    set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
    where id = v_order_id;

  perform set_config('roots.trusted_write', 'off', true);

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_subtotal + v_fee
  );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text, text) from public;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text, text) to authenticated;
