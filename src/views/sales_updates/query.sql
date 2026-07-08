with current_member as (
  select
    $1::uuid
      as team_member_id
),

scoped_clients as (
  select
    c.id,

    c.company_name,
    c.contact_name,
    c.phone,
    c.email,
    c.source_url,

    c.status_id,
    ps.name as status_name,
    ps.color as status_color,

    c.demo_url,
    c.website_url,

    c.production_updated_at,
    c.production_update_read_at,
    c.production_update_source,
    c.production_updated_by_team_member_id,

    updater.name as production_updated_by_name

  from public.clients c

  cross join current_member cm

  left join public.process_statuses ps
    on ps.id = c.status_id

  left join public.team_members updater
    on updater.id = c.production_updated_by_team_member_id

  where c.team_member_id = cm.team_member_id

    and c.is_trashed = false

    and c.production_updated_at is not null

    and (
      c.production_update_read_at is null
      or c.production_update_read_at < c.production_updated_at
    )
)

select

  -- =======================================================
  -- CLIENTS
  -- =======================================================

  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', sc.id,

          'company_name', sc.company_name,
          'contact_name', sc.contact_name,
          'phone', sc.phone,
          'email', sc.email,
          'source_url', sc.source_url,

          'status_id', sc.status_id,
          'status_name', sc.status_name,
          'status_color', sc.status_color,

          'demo_url', sc.demo_url,
          'website_url', sc.website_url,

          'production_updated_at', sc.production_updated_at,
          'production_update_read_at', sc.production_update_read_at,

          'production_update_source', sc.production_update_source,

          'production_updated_by_team_member_id',
            sc.production_updated_by_team_member_id,

          'production_updated_by_name',
            sc.production_updated_by_name
        )
        order by sc.production_updated_at desc
      )
      from scoped_clients sc
    ),
    '[]'::jsonb
  ) as clients,


  -- =======================================================
  -- CLIENT STATUSES
  -- =======================================================

  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'value', status_options.id,
          'label', status_options.name,
          'color', status_options.color
        )
        order by status_options.name
      )

      from (
        select distinct
          ps.id,
          ps.name,
          ps.color

        from public.process_statuses ps

        join public.entity_process_groups epg
          on epg.process_group_id = ps.process_group_id

        where epg.entity_key = 'clients'
      ) status_options
    ),
    '[]'::jsonb
  ) as client_statuses;