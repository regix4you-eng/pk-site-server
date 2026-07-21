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
        order by ps.name
      ),
      '[]'::json
    ) as data

  from public.process_statuses ps

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key = 'clients'
),

updated_clients as (
  select
    c.id::text as id,

    c.serial_number,

    c.company_name,
    c.contact_name,
    c.phone,
    c.email,
    c.source_url,

    c.google_drive_url,

    c.service_type_id::text as service_type_id,
    cst.key as service_type_key,
    cst.name as service_type_name,

    c.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    c.production_updated_at,
    c.production_update_read_at,
    c.production_update_source,
    c.production_updated_by_team_member_id::text
      as production_updated_by_team_member_id,

    updated_by.name as production_updated_by_name,

    demo_service.url as demo_url,
    website_service.url as website_url,

    c.created_at,
    c.updated_at

  from public.clients c

  cross join user_context uc

  left join public.client_service_types cst
    on cst.id = c.service_type_id

  left join public.process_statuses ps
    on ps.id = c.status_id

  left join public.team_members updated_by
    on updated_by.id =
      c.production_updated_by_team_member_id

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

    and ps.name in (
      'Demo sukurtas',
      'Demo pakoreguotas',
      'Svetainė padaryta',
      'Svetainė pakoreguota',
      'Dokumentai paruošti',
      'Demo išsiųstas',
      'Svetainė išsiųsta'
    )
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
            'id', uc.id,

            'serial_number', uc.serial_number,

            'company_name', uc.company_name,
            'contact_name', uc.contact_name,
            'phone', uc.phone,
            'email', uc.email,
            'source_url', uc.source_url,

            'google_drive_url', uc.google_drive_url,

            'service_type_id', uc.service_type_id,
            'service_type_key', uc.service_type_key,
            'service_type_name', uc.service_type_name,

            'status_id', uc.status_id,
            'status_name', uc.status_name,
            'status_color', uc.status_color,

            'production_updated_at',
              uc.production_updated_at,

            'production_update_read_at',
              uc.production_update_read_at,

            'production_update_source',
              uc.production_update_source,

            'production_updated_by_team_member_id',
              uc.production_updated_by_team_member_id,

            'production_updated_by_name',
              uc.production_updated_by_name,

            'demo_url', uc.demo_url,
            'website_url', uc.website_url,

            'created_at', uc.created_at,
            'updated_at', uc.updated_at
          )

          order by
            uc.updated_at desc,
            uc.production_updated_at desc,
            uc.created_at desc
        )

      from updated_clients uc
    ),
    '[]'::json
  ) as clients;