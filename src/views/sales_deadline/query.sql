with user_context as (
  select
    $1::uuid as team_member_id
),

client_statuses as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', ps.id::text,
          'label', ps.name,
          'color', coalesce(ps.color, '#64748B')
        )
        order by pg.name, ps.name
      ),
      '[]'::json
    ) as data

  from public.process_statuses ps

  join public.process_groups pg
    on pg.id = ps.process_group_id

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key = 'clients'
),

deadline_clients as (
  select
    c.id::text as id,

    c.company_name,
    c.phone,
    c.contact_name,
    c.source_url,

    c.reminder,
    c.production_comment as comment,

    c.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    c.followup_count,
    c.followup_time,
    c.last_called_at,

    c.factory_deadline,

    demo_service.url as demo_url,
    website_service.url as website_url,

    case
      when c.factory_deadline::date < current_date
      then 'Vėluoja'

      when c.factory_deadline::date = current_date
      then 'Šiandien'

      else 'Ateityje'
    end as priority,

    case
      when c.factory_deadline::date < current_date
      then 1

      when c.factory_deadline::date = current_date
      then 2

      else 3
    end as priority_sort,

    c.created_at,
    c.updated_at

  from public.clients c

  cross join user_context uc

  left join public.process_statuses ps
    on ps.id = c.status_id

  left join lateral (
    select
      coalesce(
        nullif(trim(s.url), ''),
        nullif(trim(s.base44_url), '')
      ) as url

    from public.services s

    where s.client_id = c.id
      and s.entity_key = 'demo_services'
      and coalesce(s.is_trashed, false) = false

    order by s.created_at desc

    limit 1
  ) demo_service
    on true

  left join lateral (
    select
      coalesce(
        nullif(trim(s.url), ''),
        nullif(trim(s.base44_url), '')
      ) as url

    from public.services s

    where s.client_id = c.id
      and s.entity_key = 'website_services'
      and coalesce(s.is_trashed, false) = false

    order by s.created_at desc

    limit 1
  ) website_service
    on true

  where coalesce(c.is_trashed, false) = false

    and c.team_member_id = uc.team_member_id

    and coalesce(ps.name, '') <> 'Sumokėta'

    and coalesce(c.is_paid, false) = false

    and c.factory_deadline is not null

    and c.factory_deadline::date <= current_date
)

select
  (
    select data
    from client_statuses
  ) as client_statuses,

  coalesce(
    (
      select
        json_agg(
          json_build_object(
            'id', dc.id,

            'company_name', dc.company_name,
            'phone', dc.phone,
            'contact_name', dc.contact_name,

            'reminder', dc.reminder,
            'comment', dc.comment,

            'status_id', dc.status_id,
            'status_name', dc.status_name,
            'status_color', dc.status_color,

            'followup_count', dc.followup_count,
            'followup_time', dc.followup_time,

            'factory_deadline', dc.factory_deadline,

            'priority', dc.priority,

            'last_called_at', dc.last_called_at,

            'source_url', dc.source_url,

            'demo_url', dc.demo_url,
            'website_url', dc.website_url,

            'created_at', dc.created_at,
            'updated_at', dc.updated_at
          )

          order by
            dc.priority_sort asc,
            dc.factory_deadline asc,
            dc.created_at desc
        )

      from deadline_clients dc
    ),
    '[]'::json
  ) as clients;