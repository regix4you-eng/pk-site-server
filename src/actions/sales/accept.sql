with

validated_input as (
  select
    case
      when $1::text ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then $1::uuid
      else null
    end as client_id,

    case
      when $2::text ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then $2::uuid
      else null
    end as team_member_id
),

updated_client as (
  update public.clients c

  set
    production_updated_at = null,
    production_updated_by_team_member_id = null,
    production_update_source = null,
    production_update_read_at = null,
    updated_at = now()

  from validated_input i

  where c.id = i.client_id
    and c.team_member_id = i.team_member_id
    and coalesce(c.is_trashed, false) = false

  returning
    c.id,
    c.company_name,
    c.team_member_id,
    c.status_id,
    c.production_updated_at,
    c.production_updated_by_team_member_id,
    c.production_update_source,
    c.production_update_read_at,
    c.updated_at
)

select
  true as ok,
  null::text as error,

  uc.id::text as client_id,
  uc.company_name,

  uc.team_member_id::text as team_member_id,
  uc.status_id::text as status_id,

  uc.production_updated_at,

  uc.production_updated_by_team_member_id::text
    as production_updated_by_team_member_id,

  uc.production_update_source,
  uc.production_update_read_at,
  uc.updated_at

from updated_client uc

union all

select
  false as ok,
  'CLIENT_NOT_FOUND_OR_NOT_ALLOWED' as error,

  null::text as client_id,
  null::text as company_name,

  null::text as team_member_id,
  null::text as status_id,

  null::timestamptz as production_updated_at,
  null::text as production_updated_by_team_member_id,
  null::text as production_update_source,
  null::timestamptz as production_update_read_at,
  null::timestamptz as updated_at

where not exists (
  select 1
  from updated_client
);