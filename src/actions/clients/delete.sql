with input_data as (
  select
    nullif(
      trim(
        ($1::jsonb ->> 'id')
      ),
      ''
    )::uuid as client_id,

    $2::uuid as team_member_id
),

rejected_status as (
  select
    ps.id

  from public.process_statuses ps

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key = 'clients'
    and ps.name = 'Atmesta'

  limit 1
),

trashed_client as (
  update public.clients c

  set
    is_trashed = true,
    trash_reason = 'Ištrinta rankiniu būdu',
    trashed_at = now(),

    status_id = coalesce(
      (
        select id
        from rejected_status
      ),
      c.status_id
    ),

    updated_at = now()

  from input_data i

  where c.id = i.client_id
    and c.team_member_id = i.team_member_id

  returning
    c.id::text,
    c.company_name,
    c.status_id::text,
    c.team_member_id::text,
    c.is_trashed,
    c.trash_reason,
    c.trashed_at
),

trashed_services as (
  update public.services s

  set
    is_trashed = true,
    trash_reason = 'Klientas ištrintas rankiniu būdu',
    trashed_at = now()

  from trashed_client tc

  where s.client_id = tc.id::uuid

  returning
    s.id::text,
    s.client_id::text,
    s.entity_key,
    s.name,
    s.is_trashed,
    s.trash_reason,
    s.trashed_at
)

select
  tc.id,
  tc.company_name,
  tc.status_id,
  tc.team_member_id,
  tc.is_trashed,
  tc.trash_reason,
  tc.trashed_at,

  coalesce(
    json_agg(
      json_build_object(
        'id', ts.id,
        'client_id', ts.client_id,
        'entity_key', ts.entity_key,
        'name', ts.name,
        'is_trashed', ts.is_trashed,
        'trash_reason', ts.trash_reason,
        'trashed_at', ts.trashed_at
      )
    ) filter (
      where ts.id is not null
    ),
    '[]'::json
  ) as trashed_services

from trashed_client tc

left join trashed_services ts
  on ts.client_id = tc.id

group by
  tc.id,
  tc.company_name,
  tc.status_id,
  tc.team_member_id,
  tc.is_trashed,
  tc.trash_reason,
  tc.trashed_at;