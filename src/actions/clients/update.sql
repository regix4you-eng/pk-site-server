with
change_input as (
  select
    $1::jsonb as change,
    $2::uuid as team_member_id
),

existing_client as (
  select
    c.*

  from public.clients c

  cross join change_input ci

  where c.id =
    nullif(
      trim(ci.change->>'id'),
      ''
    )::uuid

    and c.team_member_id =
      ci.team_member_id

  limit 1
),

-- =========================================================
-- INPUT DATA
-- =========================================================

input_data as (
  select
    coalesce(
      ci.change->'fields'->>'company_name',
      '__NO_CHANGE__'
    ) as company_name_raw,

    coalesce(
      ci.change->'fields'->>'contact_name',
      '__NO_CHANGE__'
    ) as contact_name_raw,

    coalesce(
      ci.change->'fields'->>'email',
      '__NO_CHANGE__'
    ) as email_raw,

    coalesce(
      ci.change->'fields'->>'phone',
      '__NO_CHANGE__'
    ) as phone_raw,

    coalesce(
      ci.change->'fields'->>'source_url',
      '__NO_CHANGE__'
    ) as source_url_raw,

    coalesce(
      ci.change->'fields'->>'reminder',
      '__NO_CHANGE__'
    ) as reminder_raw,

    coalesce(
      ci.change->'fields'->>'plan_id',
      '__NO_CHANGE__'
    ) as plan_id_raw,

    coalesce(
      ci.change->'fields'->>'category_id',
      '__NO_CHANGE__'
    ) as category_id_raw,

    coalesce(
      ci.change->'fields'->>'category_name',
      '__NO_CHANGE__'
    ) as category_name_raw,

    coalesce(
      ci.change->'fields'->>'category_color',
      '__NO_CHANGE__'
    ) as category_color_raw,

    coalesce(
      ci.change->'fields'->>'status_id',
      '__NO_CHANGE__'
    ) as status_id_raw,

    coalesce(
      ci.change->'fields'->>'followup_count',
      '__NO_CHANGE__'
    ) as followup_count_raw,

    coalesce(
      ci.change->'fields'->>'followup_time',
      '__NO_CHANGE__'
    ) as followup_time_raw,

    coalesce(
      ci.change->'fields'->>'call_count',
      '__NO_CHANGE__'
    ) as call_count_raw,

    coalesce(
      ci.change->'fields'->>'factory_deadline',
      '__NO_CHANGE__'
    ) as factory_deadline_raw,

    coalesce(
      ci.change->'fields'->>'price',
      '__NO_CHANGE__'
    ) as price_raw,

    coalesce(
      ci.change->'fields'->>'advance_paid',
      '__NO_CHANGE__'
    ) as advance_paid_raw,

    coalesce(
      ci.change->'fields'->>'production_comment',
      '__NO_CHANGE__'
    ) as production_comment_raw,

    coalesce(
      ci.change->'fields'->>'post_production_comment',
      '__NO_CHANGE__'
    ) as post_production_comment_raw,

    coalesce(
      ci.change->'fields'->>'sort_order',
      '__NO_CHANGE__'
    ) as sort_order_raw

  from change_input ci
),

-- =========================================================
-- CATEGORY BY ID
-- =========================================================

selected_category_by_id as (
  select
    cc.id,
    cc.name,
    coalesce(cc.color, '#64748B') as color

  from public.client_categories cc

  cross join existing_client ec
  cross join input_data i

  where i.category_id_raw <> '__NO_CHANGE__'

    and i.category_id_raw ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

    and cc.id = i.category_id_raw::uuid

    and (
      cc.team_member_id = ec.team_member_id
      or cc.team_member_id is null
    )

  limit 1
),

-- =========================================================
-- EXISTING CATEGORY BY NAME
-- =========================================================

existing_category_by_name as (
  select
    cc.id,
    cc.name,
    coalesce(cc.color, '#64748B') as color

  from public.client_categories cc

  cross join existing_client ec
  cross join input_data i

  where i.category_name_raw <> '__NO_CHANGE__'

    and nullif(
      trim(i.category_name_raw),
      ''
    ) is not null

    and lower(cc.name) =
      lower(trim(i.category_name_raw))

    and (
      cc.team_member_id = ec.team_member_id
      or cc.team_member_id is null
    )

    and not exists (
      select 1
      from selected_category_by_id
    )

  order by
    case
      when cc.team_member_id = ec.team_member_id
        then 0
      else 1
    end,

    cc.created_at asc

  limit 1
),

-- =========================================================
-- CREATE CATEGORY
-- =========================================================

created_category as (
  insert into public.client_categories (
    name,
    color,
    team_member_id,
    created_at
  )

  select
    trim(i.category_name_raw),

    case
      when i.category_color_raw = '__NO_CHANGE__'
        then '#64748B'

      when i.category_color_raw ~ '^#[0-9A-Fa-f]{6}$'
        then i.category_color_raw

      else '#64748B'
    end,

    ec.team_member_id,

    now()

  from input_data i

  cross join existing_client ec

  where i.category_name_raw <> '__NO_CHANGE__'

    and nullif(
      trim(i.category_name_raw),
      ''
    ) is not null

    and not exists (
      select 1
      from selected_category_by_id
    )

    and not exists (
      select 1
      from existing_category_by_name
    )

  on conflict (name, team_member_id)
  do nothing

  returning
    id,
    name,
    coalesce(color, '#64748B') as color
),

-- =========================================================
-- FINAL CATEGORY
-- =========================================================

final_new_category as (
  select
    id,
    name,
    color

  from selected_category_by_id

  union all

  select
    id,
    name,
    color

  from existing_category_by_name

  union all

  select
    id,
    name,
    color

  from created_category

  limit 1
),

-- =========================================================
-- REGISTER CATEGORY COLOR
-- =========================================================

register_category_color as (
  insert into public.ui_color_registry (
    entity_table,
    entity_id,
    entity_key,
    entity_label,
    color_hex
  )

  select
    'client_categories',
    fc.id,
    fc.name,
    fc.name,
    fc.color

  from final_new_category fc

  where fc.id is not null

    and fc.color ~ '^#[0-9A-Fa-f]{6}$'

    and not exists (
      select 1

      from public.ui_color_registry r

      where r.entity_table = 'client_categories'
        and r.entity_id = fc.id
    )

  on conflict do nothing

  returning
    entity_id
),

-- =========================================================
-- RESOLVE FINAL VALUES
-- =========================================================

resolved_data as (
  select
    ec.id,

    -- Pavadinimas
    case
      when i.company_name_raw = '__NO_CHANGE__'
        then ec.company_name

      when nullif(trim(i.company_name_raw), '') is null
        then null

      else trim(i.company_name_raw)
    end as company_name,

    -- Klientas
    case
      when i.contact_name_raw = '__NO_CHANGE__'
        then ec.contact_name

      when nullif(trim(i.contact_name_raw), '') is null
        then null

      else trim(i.contact_name_raw)
    end as contact_name,

    -- Email
    case
      when i.email_raw = '__NO_CHANGE__'
        then ec.email

      when nullif(trim(i.email_raw), '') is null
        then null

      else lower(trim(i.email_raw))
    end as email,

    -- Telefonas
    case
      when i.phone_raw = '__NO_CHANGE__'
        then ec.phone

      when nullif(trim(i.phone_raw), '') is null
        then null

      else trim(i.phone_raw)
    end as phone,

    -- Nuoroda
    case
      when i.source_url_raw = '__NO_CHANGE__'
        then ec.source_url

      when nullif(trim(i.source_url_raw), '') is null
        then null

      else trim(i.source_url_raw)
    end as source_url,

    -- Priminimas
    case
      when i.reminder_raw = '__NO_CHANGE__'
        then ec.reminder

      when nullif(trim(i.reminder_raw), '') is null
        then null

      else trim(i.reminder_raw)
    end as reminder,

    -- Planas
    case
      when i.plan_id_raw = '__NO_CHANGE__'
        then ec.plan_id

      when nullif(trim(i.plan_id_raw), '') is null
        then null

      when i.plan_id_raw ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then i.plan_id_raw::uuid

      else ec.plan_id
    end as plan_id,

    -- Kategorija
    case
      when i.category_id_raw = '__NO_CHANGE__'
       and i.category_name_raw = '__NO_CHANGE__'
        then ec.category_id

      when i.category_id_raw <> '__NO_CHANGE__'
       and nullif(trim(i.category_id_raw), '') is null
       and i.category_name_raw = '__NO_CHANGE__'
        then null

      when fc.id is not null
        then fc.id

      else ec.category_id
    end as category_id,

    -- Būsena
    case
      when i.status_id_raw = '__NO_CHANGE__'
        then ec.status_id

      when i.status_id_raw ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then i.status_id_raw::uuid

      else ec.status_id
    end as status_id,

    -- Sk.
    case
      when i.followup_count_raw = '__NO_CHANGE__'
        then ec.followup_count

      when nullif(trim(i.followup_count_raw), '') is null
        then 0

      else i.followup_count_raw::integer
    end as followup_count,

    -- Senas datetime reminder laukas paliktas kaip buvo
    case
      when i.followup_time_raw = '__NO_CHANGE__'
        then ec.followup_time

      when nullif(trim(i.followup_time_raw), '') is null
        then null

      else i.followup_time_raw::timestamptz
    end as followup_time,

    -- Call count
    case
      when i.call_count_raw = '__NO_CHANGE__'
        then ec.call_count

      when nullif(trim(i.call_count_raw), '') is null
        then 0

      else i.call_count_raw::integer
    end as call_count,

    -- Deadline
    case
      when i.factory_deadline_raw = '__NO_CHANGE__'
        then ec.factory_deadline

      when nullif(trim(i.factory_deadline_raw), '') is null
        then null

      else i.factory_deadline_raw::timestamptz
    end as factory_deadline,

    -- Kaina
    case
      when i.price_raw = '__NO_CHANGE__'
        then ec.price

      when nullif(trim(i.price_raw), '') is null
        then null

      else i.price_raw::numeric
    end as price,

    -- Avansas
    case
      when i.advance_paid_raw = '__NO_CHANGE__'
        then ec.advance_paid

      when nullif(trim(i.advance_paid_raw), '') is null
        then 0

      else i.advance_paid_raw::numeric
    end as advance_paid,

    -- Komentaras
    case
      when i.production_comment_raw = '__NO_CHANGE__'
        then ec.production_comment

      when nullif(trim(i.production_comment_raw), '') is null
        then null

      else trim(i.production_comment_raw)
    end as production_comment,

    -- Komentaras po gamybos
    case
      when i.post_production_comment_raw = '__NO_CHANGE__'
        then ec.post_production_comment

      when nullif(trim(i.post_production_comment_raw), '') is null
        then null

      else trim(i.post_production_comment_raw)
    end as post_production_comment,

    -- Drag & drop eiliškumas
    case
      when i.sort_order_raw = '__NO_CHANGE__'
        then ec.sort_order

      when nullif(trim(i.sort_order_raw), '') is null
        then ec.sort_order

      when trim(i.sort_order_raw) ~
        '^-?[0-9]+([.][0-9]+)?$'
        then trim(i.sort_order_raw)::numeric(20, 6)

      else ec.sort_order
    end as sort_order

  from existing_client ec

  cross join input_data i

  left join final_new_category fc
    on true
),

-- =========================================================
-- FINAL DATA
-- =========================================================

final_data as (
  select
    rd.id,

    rd.company_name,
    rd.contact_name,
    rd.email,
    rd.phone,
    rd.source_url,

    rd.reminder,

    rd.plan_id,
    rd.category_id,

    -- statusas tik rankinis
    rd.status_id,

    rd.followup_count,
    rd.followup_time,
    rd.call_count,

    rd.factory_deadline,

    rd.price,
    rd.advance_paid,

    rd.production_comment,
    rd.post_production_comment,
    rd.sort_order,

    -- apmokėjimas automatinis tik per is_paid
    case
      when coalesce(rd.price, 0) > 0
       and coalesce(rd.advance_paid, 0) >= coalesce(rd.price, 0)
        then true

      else false
    end as is_paid

  from resolved_data rd
),

-- =========================================================
-- VALIDATE STATUS
-- =========================================================

validated_data as (
  select
    fd.*

  from final_data fd

  join public.process_statuses ps
    on ps.id = fd.status_id
),

-- =========================================================
-- UPDATE CLIENT
-- =========================================================

updated_client as (
  update public.clients c

  set
    company_name = vd.company_name,
    contact_name = vd.contact_name,
    email = vd.email,
    phone = vd.phone,
    source_url = vd.source_url,

    reminder = vd.reminder,

    plan_id = vd.plan_id,

    category_id = vd.category_id,

    -- nekeičiam automatiškai pagal mokėjimą
    status_id = vd.status_id,

    followup_count = vd.followup_count,
    followup_time = vd.followup_time,
    call_count = vd.call_count,

    factory_deadline = vd.factory_deadline,

    price = vd.price,
    advance_paid = vd.advance_paid,
    is_paid = vd.is_paid,

    production_comment = vd.production_comment,
    post_production_comment = vd.post_production_comment,
    sort_order = vd.sort_order,

    updated_at = now()

  from validated_data vd

  where c.id = vd.id

  returning
    c.id::text,
    c.external_id,

    c.company_name,
    c.contact_name,
    c.email,
    c.phone,
    c.source_url,

    c.reminder,

    c.plan_id::text,

    c.team_member_id::text,
    c.category_id::text,
    c.status_id::text,

    c.followup_count,
    c.followup_time,
    c.first_called_at,
    c.last_called_at,
    c.call_count,

    c.factory_deadline,

    c.price,
    c.advance_paid,
    c.is_paid,

    c.production_comment,
    c.post_production_comment,
    c.sort_order,

    c.demo_url,
    c.website_url,

    c.created_at,
    c.updated_at
),


-- =========================================================
-- SERVICE SYNC TARGETS
-- =========================================================

service_targets as (
  select distinct
    uc.id::uuid as client_id,

    coalesce(
      nullif(uc.company_name, ''),
      'Be pavadinimo'
    ) as company_name,

    ps.id as status_id,
    ps.name as status_name,
    epg.entity_key

  from updated_client uc

  join public.process_statuses ps
    on ps.id = uc.status_id::uuid

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key in (
    'demo_services',
    'website_services'
  )
),

sync_data as (
  select
    st.client_id,
    st.company_name,
    st.status_id,
    st.status_name,
    st.entity_key,

    case
      when st.entity_key = 'demo_services' then (
        select tm.id
        from public.team_members tm
        where tm.name = 'Dominykas Bubnys'
        limit 1
      )

      when st.entity_key = 'website_services' then (
        select tm.id
        from public.team_members tm
        where tm.name = 'Dovilė Kulikauskienė'
        limit 1
      )
    end as assigned_team_member_id,

    case
      when st.entity_key = 'demo_services'
        and lower(st.status_name) = 'demo sukurtas'
      then true

      when st.entity_key = 'website_services'
        and lower(st.status_name) in (
          'svetainė padaryta',
          'svetainė padaryta ir išsiųsta'
        )
      then true

      else false
    end as is_completed

  from service_targets st
),

updated_services as (
  update public.services s

  set
    status_id = sd.status_id,

    name = coalesce(
      nullif(s.name, ''),
      sd.company_name
    ),

    assigned_team_member_id = coalesce(
      s.assigned_team_member_id,
      sd.assigned_team_member_id
    ),

    is_completed = sd.is_completed,
    is_trashed = false,
    trash_reason = null,
    trashed_at = null,
    updated_at = now()

  from sync_data sd

  where s.client_id = sd.client_id
    and s.entity_key = sd.entity_key
    and sd.assigned_team_member_id is not null

  returning
    s.id::text as id,
    s.client_id::text as client_id,
    s.entity_key,
    s.name,
    s.status_id::text as status_id,
    s.assigned_team_member_id::text as assigned_team_member_id,
    s.is_completed,
    'updated'::text as action
),

created_services as (
  insert into public.services (
    client_id,
    entity_key,
    name,
    status_id,
    assigned_team_member_id,
    is_completed,
    is_trashed,
    created_at,
    updated_at
  )

  select
    sd.client_id,
    sd.entity_key,
    sd.company_name,
    sd.status_id,
    sd.assigned_team_member_id,
    sd.is_completed,
    false,
    now(),
    now()

  from sync_data sd

  where sd.assigned_team_member_id is not null

    and not exists (
      select 1

      from public.services s

      where s.client_id = sd.client_id
        and s.entity_key = sd.entity_key
    )

  returning
    id::text as id,
    client_id::text as client_id,
    entity_key,
    name,
    status_id::text as status_id,
    assigned_team_member_id::text as assigned_team_member_id,
    is_completed,
    'created'::text as action
),

all_services as (
  select * from updated_services

  union all

  select * from created_services
),

synced_services_result as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'id', s.id,
          'client_id', s.client_id,
          'entity_key', s.entity_key,
          'name', s.name,
          'status_id', s.status_id,
          'assigned_team_member_id', s.assigned_team_member_id,
          'is_completed', s.is_completed,
          'action', s.action
        )
      ),
      '[]'::json
    ) as synced_services

  from all_services s
)

-- =========================================================
-- FINAL RESPONSE
-- =========================================================

select
  uc.id,
  uc.external_id,

  uc.company_name,
  uc.contact_name,
  uc.email,
  uc.phone,
  uc.source_url,

  uc.reminder,

  uc.plan_id,
  p.name as plan_name,
  coalesce(p.color, '#64748B') as plan_color,

  uc.team_member_id,
  tm.name as team_member_name,

  uc.category_id,
  cc.name as category_name,
  coalesce(cc.color, '#64748B') as category_color,

  uc.status_id,
  ps.name as status_name,
  coalesce(ps.color, '#64748B') as status_color,

  uc.followup_count,
  uc.followup_time,
  uc.first_called_at,
  uc.last_called_at,
  uc.call_count,

  uc.factory_deadline,

  uc.price,
  uc.advance_paid,

  -- View naudoja advance_paid kaip sumokėtą sumą
  uc.advance_paid as paid_amount,

  uc.is_paid,

  uc.production_comment,
  uc.post_production_comment,

  uc.demo_url,
  uc.website_url,

  uc.created_at,
  uc.updated_at,

  ssr.synced_services

from updated_client uc

left join public.plans p
  on p.id = uc.plan_id::uuid

left join public.team_members tm
  on tm.id = uc.team_member_id::uuid

left join public.client_categories cc
  on cc.id = uc.category_id::uuid

left join public.process_statuses ps
  on ps.id = uc.status_id::uuid

cross join synced_services_result ssr;
