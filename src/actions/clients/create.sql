with

-- =========================================================
-- 1. INPUT DATA
-- =========================================================
--
-- Frontend changeset duomenys normalizuojami vienoje vietoje.
--
-- CREATE atveju:
--   changes.temp_id tampa clients.external_id
--
-- Tai leidžia vėliau frontend tmp row susieti su realiu klientu.
--
-- =========================================================

input_params as (
  select
    $1::jsonb as changes,
    $2::uuid as team_member_id
),

input_data as (
  select
    coalesce(
      nullif(
        trim(
          coalesce(
            ip.changes ->> 'id',
            ip.changes ->> 'temp_id',
            ''
          )
        ),
        ''
      ),
      gen_random_uuid()::text
    ) as input_id,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'company_name', '')),
      ''
    ) as company_name,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'contact_name', '')),
      ''
    ) as contact_name,

    nullif(
      lower(trim(coalesce(ip.changes -> 'fields' ->> 'email', ''))),
      ''
    ) as email,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'phone', '')),
      ''
    ) as phone,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'source_url', '')),
      ''
    ) as source_url,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'plan_id', '')),
      ''
    ) as plan_id_raw,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'service_type_id', '')),
      ''
    ) as service_type_id_raw,

    ip.team_member_id,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'category_id', '')),
      ''
    ) as category_id_raw,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'category_name', '')),
      ''
    ) as category_name,

    coalesce(
      nullif(
        trim(coalesce(ip.changes -> 'fields' ->> 'category_color', '')),
        ''
      ),
      '#64748B'
    ) as category_color,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'status_id', '')),
      ''
    ) as status_id_raw,

    coalesce(
      nullif(
        trim(coalesce(ip.changes -> 'fields' ->> 'followup_count', '')),
        ''
      )::int,
      0
    ) as followup_count,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'followup_time', '')),
      ''
    ) as followup_time_raw,

    coalesce(
      nullif(
        trim(coalesce(ip.changes -> 'fields' ->> 'call_count', '')),
        ''
      )::int,
      0
    ) as call_count,

    nullif(
      trim(coalesce(ip.changes -> 'fields' ->> 'price', '')),
      ''
    )::numeric as price,

    coalesce(
      nullif(
        trim(coalesce(ip.changes -> 'fields' ->> 'advance_paid', '')),
        ''
      )::numeric,
      0
    ) as advance_paid

  from input_params ip
),


-- =========================================================
-- 2. DEFAULT CLIENT STATUS
-- =========================================================
--
-- Jei incoming status_id nėra validus UUID,
-- naudojamas client scope statusas "Naujas".
--
-- =========================================================

default_status as (
  select
    ps.id

  from public.process_statuses ps

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  where epg.entity_key = 'clients'
    and ps.name = 'Naujas'

  limit 1
),


-- =========================================================
-- 3. RESOLVE FINAL CLIENT STATUS
-- =========================================================

resolved_status as (
  select
    case
      when i.status_id_raw ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then i.status_id_raw::uuid

      else ds.id
    end as status_id

  from input_data i

  cross join default_status ds
),


-- =========================================================
-- 4. RESOLVE SERVICE TYPE BY UUID
-- =========================================================

selected_service_type as (
  select
    cst.id,
    cst.key,
    cst.name

  from public.client_service_types cst

  cross join input_data i

  where i.service_type_id_raw ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

    and cst.id = i.service_type_id_raw::uuid
    and cst.is_active = true

  limit 1
),


-- =========================================================
-- 4. RESOLVE CATEGORY BY UUID
-- =========================================================
--
-- Leidžiama:
--   - konkretaus pardavėjo kategorija
--   - globali kategorija (team_member_id IS NULL)
--
-- =========================================================

selected_category_by_id as (
  select
    cc.id,
    cc.name,
    coalesce(
      cc.color,
      '#64748B'
    ) as color

  from public.client_categories cc

  cross join input_data i

  where i.category_id_raw ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

    and cc.id = i.category_id_raw::uuid

    and (
      cc.team_member_id = i.team_member_id
      or cc.team_member_id is null
    )

  limit 1
),


-- =========================================================
-- 5. RESOLVE EXISTING CATEGORY BY NAME
-- =========================================================
--
-- Jei UUID nerastas, bandoma rasti kategoriją pagal vardą.
--
-- Pirmenybė:
--   1. pardavėjo kategorijai
--   2. globaliai kategorijai
--
-- =========================================================

existing_category_by_name as (
  select
    cc.id,
    cc.name,
    coalesce(
      cc.color,
      '#64748B'
    ) as color

  from public.client_categories cc

  cross join input_data i

  where i.category_name is not null

    and lower(cc.name) =
        lower(i.category_name)

    and (
      cc.team_member_id = i.team_member_id
      or cc.team_member_id is null
    )

    and not exists (
      select 1
      from selected_category_by_id
    )

  order by
    case
      when cc.team_member_id = i.team_member_id
      then 0
      else 1
    end,

    cc.created_at asc

  limit 1
),


-- =========================================================
-- 6. CREATE CATEGORY IF NEEDED
-- =========================================================

created_category as (
  insert into public.client_categories (
    name,
    color,
    team_member_id,
    created_at
  )

  select
    i.category_name,
    i.category_color,
    i.team_member_id,
    now()

  from input_data i

  where i.category_name is not null

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
    coalesce(
      color,
      '#64748B'
    ) as color
),


-- =========================================================
-- 7. FINAL CATEGORY
-- =========================================================
--
-- Visas tolimesnis SQL naudoja vieną galutinę kategoriją.
--
-- =========================================================

final_category as (
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
-- 8. CALCULATE NEW CLIENT SORT ORDER
-- =========================================================
--
-- Naujas klientas turi atsirasti kategorijos viršuje.
--
-- Tvarka skaičiuojama atskirai pagal:
--   team_member_id
--   category_id
--
-- Jei kategorijoje jau yra klientų:
--   MIN(sort_order) - 1000
--
-- Jei kategorija tuščia:
--   1000
--
-- IS NOT DISTINCT FROM svarbu dėl category_id = NULL,
-- kad "Be kategorijos" klientai turėtų savo bendrą tvarką.
--
-- =========================================================

next_sort_order as (
  select
    coalesce(
      min(c.sort_order) - 1000::numeric,
      1000::numeric
    )::numeric(20, 6) as sort_order

  from input_data i

  left join final_category fc
    on true

  left join public.clients c
    on c.team_member_id = i.team_member_id

   and c.category_id is not distinct from fc.id
),


-- =========================================================
-- 9. REGISTER CATEGORY COLOR
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

  from final_category fc

  where fc.id is not null

    and fc.color ~
        '^#[0-9A-Fa-f]{6}$'

    and not exists (
      select 1

      from public.ui_color_registry r

      where r.entity_table =
            'client_categories'

        and r.entity_id =
            fc.id
    )

  on conflict
  do nothing

  returning
    entity_id
),


-- =========================================================
-- 10. CREATE CLIENT
-- =========================================================
--
-- SVARBU:
-- created_client grąžina native PostgreSQL tipus:
--
--   id uuid
--   status_id uuid
--   team_member_id uuid
--
-- Vidinėje SQL logikoje jų nekonvertuojame į text.
-- Į text castinsime tik galutiniame output.
--
-- =========================================================

created_client as (
  insert into public.clients (
    external_id,

    company_name,
    contact_name,
    email,
    phone,
    source_url,

    plan_id,
    service_type_id,

    team_member_id,
    category_id,
    status_id,
    sort_order,

    followup_count,
    followup_time,
    call_count,

    price,
    advance_paid,
    is_paid,

    created_at,
    updated_at
  )

  select
    i.input_id,

    i.company_name,
    i.contact_name,
    i.email,
    i.phone,
    i.source_url,

    case
      when i.plan_id_raw ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then i.plan_id_raw::uuid

      else null
    end as plan_id,

    (
      select id
      from selected_service_type
    ) as service_type_id,

    i.team_member_id,
    fc.id as category_id,
    rs.status_id,
    nso.sort_order,

    i.followup_count,

    case
      when i.followup_time_raw is not null
      then i.followup_time_raw::timestamptz

      else null
    end as followup_time,

    i.call_count,

    i.price,
    i.advance_paid,

    (
      i.price is not null
      and i.price > 0
      and coalesce(
        i.advance_paid,
        0
      ) >= i.price
    ) as is_paid,

    now(),
    now()

  from input_data i

  cross join resolved_status rs

  cross join next_sort_order nso

  left join final_category fc
    on true

  returning
    id,
    external_id,

    company_name,
    contact_name,
    email,
    phone,
    source_url,

    plan_id,
    service_type_id,

    team_member_id,
    category_id,
    status_id,
    sort_order,

    followup_count,
    followup_time,
    first_called_at,
    last_called_at,
    call_count,

    price,
    advance_paid,
    is_paid,

    created_at,
    updated_at
),


-- =========================================================
-- 11. DETERMINE PRODUCTION SERVICE TARGETS
-- =========================================================
--
-- Kliento finalus statusas:
--
--   created_client.status_id
--      ↓
--   process_statuses.process_group_id
--      ↓
--   entity_process_groups.entity_key
--
-- Production service kuriama / syncinama tik jei grupė
-- mapped į:
--
--   demo_services
--   website_services
--
-- =========================================================

service_targets as (
  select distinct
    cc.id as client_id,

    coalesce(
      nullif(
        cc.company_name,
        ''
      ),
      'Be pavadinimo'
    ) as company_name,

    ps.id as status_id,
    ps.name as status_name,

    epg.entity_key

  from created_client cc

  join public.process_statuses ps
    on ps.id = cc.status_id

  join public.entity_process_groups epg
    on epg.process_group_id =
       ps.process_group_id

  where epg.entity_key in (
    'demo_services',
    'website_services'
  )
),


-- =========================================================
-- 12. PRODUCTION OWNER RULES
-- =========================================================
--
-- Vienintelė vieta šiame query, kur aprašyti
-- gamybos atsakingi žmonės.
--
-- Jei ateityje keisis specialistas,
-- keisti reikia tik čia.
--
-- =========================================================

production_owner_rules (
  entity_key,
  team_member_name
) as (
  values
    (
      'demo_services'::text,
      'Dominykas Bubnys'::text
    ),
    (
      'website_services'::text,
      'Dovilė Kulikauskienė'::text
    )
),


-- =========================================================
-- 13. BUILD FINAL SERVICE SYNC DATA
-- =========================================================
--
-- Čia nustatoma:
--
--   client_id
--   entity_key
--   status_id
--   assigned_team_member_id
--   is_completed
--
-- Completion business rule palikta pagal tavo antrą query.
--
-- =========================================================

sync_data as (
  select
    st.client_id,
    st.company_name,

    st.status_id,
    st.status_name,

    st.entity_key,

    tm.id as assigned_team_member_id,

    case

      when st.entity_key = 'demo_services'
        and lower(trim(st.status_name)) =
            lower('Demo sukurtas')
      then true

      when st.entity_key = 'website_services'
        and lower(trim(st.status_name)) in (
          lower('Svetainė padaryta'),
          lower('Svetainė padaryta ir išsiųsta')
        )
      then true

      else false

    end as is_completed

  from service_targets st

  join production_owner_rules por
    on por.entity_key =
       st.entity_key

  left join lateral (
    select
      candidate.id

    from public.team_members candidate

    where lower(
      trim(candidate.name)
    ) = lower(
      trim(por.team_member_name)
    )

    order by
      candidate.created_at asc nulls last,
      candidate.id

    limit 1
  ) tm
    on true
),


-- =========================================================
-- 14. UPDATE EXISTING SERVICES
-- =========================================================
--
-- Jei service jau egzistuoja tam pačiam:
--
--   client_id
--   entity_key
--
-- tada:
--
--   UPDATE status_id
--   UPDATE is_completed
--   revive iš trash
--
-- assigned_team_member_id:
--   esamas assignee išlaikomas
--   jei NULL → naudojamas default production owner
--
-- =========================================================

updated_services as (
  update public.services s

  set
    status_id =
      sd.status_id,

    name =
      coalesce(
        nullif(
          s.name,
          ''
        ),
        sd.company_name
      ),

    assigned_team_member_id =
      coalesce(
        s.assigned_team_member_id,
        sd.assigned_team_member_id
      ),

    is_completed =
      sd.is_completed,

    is_trashed =
      false,

    trash_reason =
      null,

    trashed_at =
      null,

    updated_at =
      now()

  from sync_data sd

  where s.client_id =
        sd.client_id

    and s.entity_key =
        sd.entity_key

    and sd.assigned_team_member_id
        is not null

  returning
    s.id,

    s.client_id,
    s.entity_key,
    s.name,

    s.status_id,
    s.assigned_team_member_id,

    s.is_completed,

    'updated'::text as action
),


-- =========================================================
-- 15. CREATE MISSING SERVICES
-- =========================================================
--
-- Jei tam client_id + entity_key dar nėra jokios service:
--
--   CREATE
--
-- Jei service egzistuoja, ją jau apdorojo UPDATE CTE.
--
-- =========================================================

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

  where sd.assigned_team_member_id
        is not null

    and not exists (
      select 1

      from public.services s

      where s.client_id =
            sd.client_id

        and s.entity_key =
            sd.entity_key
    )

  returning
    id,

    client_id,
    entity_key,
    name,

    status_id,
    assigned_team_member_id,

    is_completed,

    'created'::text as action
),


-- =========================================================
-- 16. COMBINE SERVICE MUTATION RESULTS
-- =========================================================

all_synced_services as (
  select
    id,
    client_id,
    entity_key,
    name,
    status_id,
    assigned_team_member_id,
    is_completed,
    action

  from updated_services

  union all

  select
    id,
    client_id,
    entity_key,
    name,
    status_id,
    assigned_team_member_id,
    is_completed,
    action

  from created_services
),


-- =========================================================
-- 17. BUILD SYNCED SERVICES JSON
-- =========================================================
--
-- Visada viena JSON reikšmė:
--
--   []                 jei production service nereikėjo
--   [{...}]            jei viena service syncinta
--   [{...}, {...}]     jei mappingas grąžintų kelias
--
-- =========================================================

synced_services_result as (
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            s.id::text,

          'client_id',
            s.client_id::text,

          'entity_key',
            s.entity_key,

          'name',
            s.name,

          'status_id',
            s.status_id::text,

          'assigned_team_member_id',
            s.assigned_team_member_id::text,

          'is_completed',
            s.is_completed,

          'action',
            s.action
        )
        order by
          s.entity_key,
          s.action
      ),

      '[]'::jsonb
    ) as synced_services

  from all_synced_services s
)


-- =========================================================
-- 18. FINAL RESPONSE
-- =========================================================
--
-- Grąžinama viena row:
--
--   sukurtas klientas
--   + jo production service sync rezultatai
--
-- =========================================================

select
  cc.id::text as id,
  cc.external_id,

  cc.company_name,
  cc.contact_name,
  cc.email,
  cc.phone,
  cc.source_url,

  cc.plan_id::text as plan_id,

  p.name as plan_name,

  coalesce(
    p.color,
    '#64748B'
  ) as plan_color,

  cc.service_type_id::text
    as service_type_id,

  cst.key
    as service_type_key,

  cst.name
    as service_type_name,

  cc.team_member_id::text
    as team_member_id,

  tm.name
    as team_member_name,

  cc.category_id::text
    as category_id,

  cat.name
    as category_name,

  coalesce(
    cat.color,
    '#64748B'
  ) as category_color,

  cc.status_id::text
    as status_id,

  ps.name
    as status_name,

  coalesce(
    ps.color,
    '#64748B'
  ) as status_color,

  cc.sort_order,

  cc.followup_count,
  cc.followup_time,
  cc.first_called_at,
  cc.last_called_at,
  cc.call_count,

  cc.price,
  cc.advance_paid,
  cc.is_paid,

  cc.created_at,
  cc.updated_at,

  ssr.synced_services

from created_client cc

left join public.plans p
  on p.id = cc.plan_id

left join public.client_service_types cst
  on cst.id = cc.service_type_id

left join public.team_members tm
  on tm.id = cc.team_member_id

left join public.client_categories cat
  on cat.id = cc.category_id

left join public.process_statuses ps
  on ps.id = cc.status_id

cross join synced_services_result ssr;