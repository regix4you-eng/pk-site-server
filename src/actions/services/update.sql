with

-- =========================================================
-- 1. NORMALIZE INCOMING CHANGESET
-- =========================================================

input_data as (
  select
    coalesce(
      $1::jsonb #>> '{fields,status_id}',
      '__NO_CHANGE__'
    ) as status_id_raw,

    case
      when $1::jsonb #> '{fields,comment}' is null
      then '__NO_CHANGE__'
      else trim(
        coalesce(
          $1::jsonb #>> '{fields,comment}',
          ''
        )
      )
    end as comment_raw,

    case
      when $1::jsonb #> '{fields,url}' is null
      then '__NO_CHANGE__'
      else trim(
        coalesce(
          $1::jsonb #>> '{fields,url}',
          ''
        )
      )
    end as url_raw,

    case
      when $1::jsonb #> '{fields,deadline}' is null
      then '__NO_CHANGE__'
      else trim(
        coalesce(
          $1::jsonb #>> '{fields,deadline}',
          ''
        )
      )
    end as deadline_raw,

    case
      when $1::jsonb #> '{fields,completion_comment}' is null
      then '__NO_CHANGE__'
      else trim(
        coalesce(
          $1::jsonb #>> '{fields,completion_comment}',
          ''
        )
      )
    end as completion_comment_raw,

    case
      when $1::jsonb #> '{fields,email_is_sent}' is null
      then '__NO_CHANGE__'
      else trim(
        coalesce(
          $1::jsonb #>> '{fields,email_is_sent}',
          ''
        )
      )
    end as email_is_sent_raw,

    nullif(
      trim(
        $1::jsonb ->> 'id'
      ),
      ''
    ) as service_id_raw,

    $2::uuid as current_team_member_id
),


-- =========================================================
-- 2. UPDATE SERVICE
-- =========================================================

updated_service as (
  update public.services s

  set
    status_id = case
      when i.status_id_raw = '__NO_CHANGE__'
      then s.status_id

      when nullif(
        trim(i.status_id_raw),
        ''
      ) is null
      then s.status_id

      else i.status_id_raw::uuid
    end,

    comment = case
      when i.comment_raw = '__NO_CHANGE__'
      then s.comment

      else nullif(
        trim(i.comment_raw),
        ''
      )
    end,

    url = case
      when i.url_raw = '__NO_CHANGE__'
      then s.url

      else nullif(
        trim(i.url_raw),
        ''
      )
    end,

    deadline = case
      when i.deadline_raw = '__NO_CHANGE__'
      then s.deadline

      else nullif(
        trim(i.deadline_raw),
        ''
      )::date
    end,

    completion_comment = case
      when i.completion_comment_raw = '__NO_CHANGE__'
      then s.completion_comment

      else nullif(
        trim(i.completion_comment_raw),
        ''
      )
    end,

    email_is_sent = case
      when i.email_is_sent_raw = '__NO_CHANGE__'
      then s.email_is_sent

      when nullif(
        trim(i.email_is_sent_raw),
        ''
      ) is null
      then s.email_is_sent

      else trim(
        i.email_is_sent_raw
      )::boolean
    end,

    updated_at = now()

  from input_data i

  where s.id = i.service_id_raw::uuid
    and s.assigned_team_member_id =
        i.current_team_member_id

  returning
    s.id,
    s.client_id,
    s.entity_key,
    s.name,
    s.status_id,
    s.assigned_team_member_id,
    s.comment,
    s.url,
    s.deadline,
    s.completion_comment,
    s.email_is_sent,
    s.updated_at
),


-- =========================================================
-- 3. UPDATE RELATED CLIENT
-- =========================================================

updated_client as (
  update public.clients c

  set
    status_id =
      us.status_id,

    production_updated_at =
      now(),

    production_updated_by_team_member_id =
      us.assigned_team_member_id,

    production_update_source =
      case
        when us.entity_key = 'demo_services'
        then 'demo'

        when us.entity_key = 'website_services'
        then 'website'

        else us.entity_key
      end,

    updated_at =
      now()

  from updated_service us

  where c.id = us.client_id

  returning
    c.id,
    c.status_id,
    c.production_updated_at,
    c.production_updated_by_team_member_id,
    c.production_update_source,
    c.production_update_read_at,
    c.updated_at
)


-- =========================================================
-- 4. FINAL RESPONSE
-- =========================================================

select
  us.id::text as id,

  us.client_id::text
    as client_id,

  us.entity_key,
  us.name,

  us.status_id::text
    as status_id,

  us.assigned_team_member_id::text
    as assigned_team_member_id,

  us.comment,
  us.url,
  us.deadline,
  us.completion_comment,
  us.email_is_sent,
  us.updated_at,

  uc.status_id::text
    as client_status_id,

  uc.production_updated_at,

  uc.production_updated_by_team_member_id::text
    as production_updated_by_team_member_id,

  uc.production_update_source,
  uc.production_update_read_at,

  uc.updated_at
    as client_updated_at

from updated_service us

left join updated_client uc
  on uc.id = us.client_id;