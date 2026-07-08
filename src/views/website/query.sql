with website_statuses as (
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
  where epg.entity_key = 'website_services'
),

website_services as (
  select
    sv.id::text as id,
    sv.name as service_name,

    c.company_name,
    c.source_url,

    sv.base44_url,
    sv.url,

    sv.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    sv.comment,
    sv.completion_comment,
    sv.deadline,

    coalesce(sv.is_completed, false) as is_completed,
    coalesce(sv.email_is_sent, false) as email_is_sent,

    (
      coalesce(sv.is_trashed, false)
      or coalesce(c.is_trashed, false)
    ) as is_trashed,

    coalesce(sv.trash_reason, c.trash_reason) as trash_reason,

    sv.created_at

  from public.services sv
  join public.clients c
    on c.id = sv.client_id
  left join public.process_statuses ps
    on ps.id = sv.status_id
  where sv.entity_key = 'website_services'
    and sv.assigned_team_member_id = $1::uuid
)

select
  (select data from website_statuses) as website_statuses,

  coalesce(
    json_agg(
      json_build_object(
        'id', ws.id,
        'service_name', ws.service_name,
        'company_name', ws.company_name,
        'source_url', ws.source_url,
        'base44_url', ws.base44_url,
        'url', ws.url,
        'status_id', ws.status_id,
        'status_name', ws.status_name,
        'status_color', ws.status_color,
        'comment', ws.comment,
        'completion_comment', ws.completion_comment,
        'deadline', ws.deadline,
        'is_completed', ws.is_completed,
        'email_is_sent', ws.email_is_sent,
        'is_trashed', ws.is_trashed,
        'trash_reason', ws.trash_reason
      )
      order by ws.created_at desc
    ) filter (where ws.id is not null),
    '[]'::json
  ) as services
from website_services ws;