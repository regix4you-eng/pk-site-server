with demo_statuses as (
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

  where epg.entity_key = 'demo_services'
),

demo_services as (
  select
    sv.id::text as id,
    ps

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id sv.name as service_name,

    c.company_name,
    c.source_url,

    sv.base44_url,
    sv.base44_prompt,
    sv.xml_text,

    sv.status_id::text as status_id,

    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    sv.comment,
    sv.completion_comment,
    sv.url,

    coalesce(sv.is_completed, false) as is_completed,

    (
      coalesce(sv.is_trashed, false)
      or coalesce(c.is_trashed, false)
    ) as is_trashed,

    coalesce(
      sv.trash_reason,
      c.trash_reason
    ) as trash_reason,

    sv.created_at

  from public.services sv

  join public.clients c
    on c.id = sv.client_id

  left join public.process_statuses ps
    on ps.id = sv.status_id

  where sv.entity_key = 'demo_services'
    and sv.assigned_team_member_id = $1::uuid
)

select
  (
    select data
    from demo_statuses
  ) as demo_statuses,

  coalesce(
    json_agg(
      json_build_object(
        'id', ds.id,
        'service_name', ds.service_name,
        'company_name', ds.company_name,
        'source_url', ds.source_url,
        'base44_url', ds.base44_url,
        'base44_prompt', ds.base44_prompt,
        'xml_text', ds.xml_text,
        'status_id', ds.status_id,
        'status_name', ds.status_name,
        'status_color', ds.status_color,
        'comment', ds.comment,
        'completion_comment', ds.completion_comment,
        'url', ds.url,
        'is_completed', ds.is_completed,
        'is_trashed', ds.is_trashed,
        'trash_reason', ds.trash_reason
      )
      order by ds.created_at desc
    ) filter (
      where ds.id is not null
    ),
    '[]'::json
  ) as services

from demo_services ds;