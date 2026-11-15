-- Canceled bookings can't be reopened (their slot and discount were already
-- released). Apply once to an existing PIBASE project after migrations 001-004.

create or replace function public.release_booking_resources() returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    delete from booking_slot_claims where booking_id=old.id;
    if old.discount_code is not null and not old.discount_reversed then
      update discount_codes set uses=greatest(0,uses-1),
        balance=case when kind='gift_card' then coalesce(balance,0)+old.discount_amount else balance end
        where user_id=old.user_id and upper(code)=upper(old.discount_code);
    end if;
    return old;
  end if;
  -- A canceled booking stays canceled. Its time slot and discount were
  -- given back when it was canceled, so reopening it would let them be used
  -- twice. Book again instead.
  if tg_op='UPDATE' and old.status='canceled' and new.status<>'canceled' then
    new.status := 'canceled';
    return new;
  end if;
  if new.status='canceled' and old.status<>'canceled' then
    delete from booking_slot_claims where booking_id=old.id;
    if old.discount_code is not null and not old.discount_reversed then
      update discount_codes set uses=greatest(0,uses-1),
        balance=case when kind='gift_card' then coalesce(balance,0)+old.discount_amount else balance end
        where user_id=old.user_id and upper(code)=upper(old.discount_code);
    end if;
    new.discount_reversed := true;
    return new;
  end if;
  return new;
end;
$$;
drop trigger if exists release_booking_resources on bookings;
create trigger release_booking_resources before update of status or delete on bookings
  for each row execute function public.release_booking_resources();
