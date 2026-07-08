with user_context as (
  select
    tm.id as team_member_id,
    tm.name as team_member_name,
    jr.name as role_name,
    d.name as department_name,

    case
      when d.name = 'director' then true
      else false
    end as is_director

  from public.team_members tm

  join public.job_roles jr
    on jr.id = tm.job_role_id

  join public.departments d
    on d.id = jr.department_id

  where tm.id = $1::uuid

  limit 1
),

status_lookup as (
  select
    ps.id,
    ps.name,
    coalesce(ps.color, '#64748B') as color

  from public.process_statuses ps

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key = 'clients'
),

scoped_clients as (
  select
    c.*

  from public.clients c

  cross join user_context uc

  where coalesce(c.is_trashed, false) = false

    and (
      uc.is_director = true
      or c.team_member_id = uc.team_member_id
    )
),

financial_kpis as (
  select

    /* Kiek realiai jau gauta pinigų */
    coalesce(
      sum(
        coalesce(sc.advance_paid, 0)
      ),
      0
    ) as earned,

    /* Kiek dar liko gauti */
    coalesce(
      sum(
        greatest(
          coalesce(sc.price, 0)
          - coalesce(sc.advance_paid, 0),
          0
        )
      ),
      0
    ) as waiting_payment,

    /* Bendra sutarta klientų vertė.
       Permoka potencialo nedidina. */
    coalesce(
      sum(
        coalesce(sc.price, 0)
      ),
      0
    ) as potential

  from scoped_clients sc
),

client_kpis as (
  select

    count(*) filter (
      where coalesce(sc.is_paid, false) = false
    ) as open_clients,

    count(*) filter (
      where coalesce(sc.is_paid, false) = true
    ) as paid_clients

  from scoped_clients sc
),

today_calls as (
  select
    sc.id::text as id,

    coalesce(
      nullif(sc.company_name, ''),
      nullif(sc.contact_name, ''),
      nullif(sc.phone, ''),
      'Be pavadinimo'
    ) as company_name,

    sc.contact_name,
    sc.phone,
    sc.email,
    sc.source_url,

    sc.status_id::text as status_id,
    sl.name as status_name,
    coalesce(sl.color, '#64748B') as status_color,

    coalesce(sc.followup_count, 0) as sk_count,
    coalesce(sc.followup_count, 0) as followup_count,

    sc.followup_time,
    sc.last_called_at,

    coalesce(sc.call_count, 0) as call_count,

    ''::text as reminder,

    case
      when sc.followup_time::date < current_date
      then 'Vėluoja'

      else 'Šiandien'
    end as priority,

    case
      when sc.followup_time::date < current_date
      then '#F59E0B'

      else '#14B8A6'
    end as priority_color,

    sc.created_at,
    sc.updated_at

  from scoped_clients sc

  left join status_lookup sl
    on sl.id = sc.status_id

  where sc.followup_time is not null

    and sc.followup_time::date <= current_date

    and coalesce(sl.name, '') not in (
      'Sumokėta',
      'Atmesta',
      'Netiko / neatsiliepė',

      'Perduoti demo kūrimui',
      'Perduoti demo korekcijai',
      'Perduoti svetainės kūrimui',
      'Perduoti svetainės korekcijai',

      'Demo kūrimui',
      'Demo korekcijai',
      'Svetainė kūrimui',
      'Svetainė korekcijai'
    )
),

hot_clients as (
  select
    sc.id::text as id,

    coalesce(
      nullif(sc.company_name, ''),
      nullif(sc.contact_name, ''),
      nullif(sc.phone, ''),
      'Be pavadinimo'
    ) as company_name,

    sc.contact_name,
    sc.phone,
    sc.email,
    sc.source_url,

    sc.status_id::text as status_id,
    sl.name as status_name,
    coalesce(sl.color, '#64748B') as status_color,

    coalesce(
      status_history.sent_at,
      sc.updated_at,
      sc.created_at
    ) as sent_at,

    coalesce(sc.price, 0) as price,
    coalesce(sc.advance_paid, 0) as advance_paid,
    coalesce(sc.is_paid, false) as is_paid,

    sc.created_at,
    sc.updated_at

  from scoped_clients sc

  left join status_lookup sl
    on sl.id = sc.status_id

  left join lateral (
    select
      h.status_changed_at as sent_at

    from public.client_status_history h

    where h.client_id = sc.id
      and h.status_id = sc.status_id

    order by h.status_changed_at desc

    limit 1
  ) status_history
    on true

  where sl.name in (
    'Dokumentai išsiųsti',
    'Svetainė padaryta ir išsiųsta'
  )
),

client_status_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', sl.id::text,
          'label', sl.name,
          'color', sl.color
        )
        order by sl.name asc
      ),
      '[]'::json
    ) as data

  from status_lookup sl
),

priority_options as (
  select
    json_build_array(
      json_build_object(
        'value', 'Vėluoja',
        'label', 'Vėluoja',
        'color', '#F59E0B'
      ),

      json_build_object(
        'value', 'Šiandien',
        'label', 'Šiandien',
        'color', '#14B8A6'
      )
    ) as data
)

select

  json_build_object(
    'earned',
      fk.earned,

    'waiting_payment',
      fk.waiting_payment,

    'potential',
      fk.potential,

    'commission',
      fk.earned * 0.10,

    'open_clients',
      ck.open_clients,

    'paid_clients',
      ck.paid_clients
  ) as kpis,

  coalesce(
    (
      select
        json_agg(
          json_build_object(
            'id', tc.id,

            'company_name', tc.company_name,
            'contact_name', tc.contact_name,
            'phone', tc.phone,
            'email', tc.email,
            'source_url', tc.source_url,

            'status_id', tc.status_id,
            'status_name', tc.status_name,
            'status_color', tc.status_color,

            'sk_count', tc.sk_count,
            'followup_count', tc.followup_count,

            'followup_time', tc.followup_time,
            'last_called_at', tc.last_called_at,

            'call_count', tc.call_count,

            'reminder', tc.reminder,

            'priority', tc.priority,
            'priority_color', tc.priority_color
          )

          order by
            tc.followup_time asc,
            tc.created_at desc
        )

      from today_calls tc
    ),
    '[]'::json
  ) as today_calls,

  coalesce(
    (
      select
        json_agg(
          json_build_object(
            'id', hc.id,

            'company_name', hc.company_name,
            'contact_name', hc.contact_name,
            'phone', hc.phone,
            'email', hc.email,
            'source_url', hc.source_url,

            'status_id', hc.status_id,
            'status_name', hc.status_name,
            'status_color', hc.status_color,

            'sent_at', hc.sent_at,

            'price', hc.price,
            'advance_paid', hc.advance_paid,
            'is_paid', hc.is_paid
          )

          order by
            hc.sent_at asc nulls last,
            hc.created_at desc
        )

      from hot_clients hc
    ),
    '[]'::json
  ) as hot_clients,

  (
    select data
    from client_status_options
  ) as client_statuses,

  (
    select data
    from priority_options
  ) as priority_options,

  (
    select team_member_id::text
    from user_context
  ) as current_team_member_id,

  (
    select is_director
    from user_context
  ) as is_director

from financial_kpis fk

cross join client_kpis ck;