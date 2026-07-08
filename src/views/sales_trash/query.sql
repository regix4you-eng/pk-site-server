with client_statuses as (
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

trash_clients as (
  select
    c.id::text as id,
    c.company_name,
    c.contact_name,
    c.phone,
    c.email,
    c.source_url,

    c.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    c.team_member_id::text as team_member_id,
    tm.name as team_member_name,

    c.trash_reason,
    c.trashed_at,
    c.created_at,
    c.updated_at

  from public.clients c
  left join public.process_statuses ps
    on ps.id = c.status_id
  left join public.team_members tm
    on tm.id = c.team_member_id

  where coalesce(c.is_trashed, false) = true
    and c.team_member_id = $1::uuid
)

select
  (select data from client_statuses) as client_statuses,

  coalesce(
    (
      select json_agg(
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

          'team_member_id', tc.team_member_id,
          'team_member_name', tc.team_member_name,

          'trash_reason', tc.trash_reason,
          'trashed_at', tc.trashed_at,
          'created_at', tc.created_at,
          'updated_at', tc.updated_at
        )
        order by
          tc.trashed_at desc nulls last,
          tc.created_at desc
      )
      from trash_clients tc
    ),
    '[]'::json
  ) as clients;