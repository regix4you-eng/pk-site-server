with user_context as (
  select
    $1::uuid
      as team_member_id
),

-- =========================================================
-- CLIENT STATUS OPTIONS
--
-- Grupės:
--   process_groups.sort_order
--
-- Statusai grupės viduje:
--   process_statuses.sort_order
-- =========================================================

client_statuses as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', ps.id::text,
          'label', ps.name,
          'color', coalesce(ps.color, '#64748B'),
          'service_type_ids', coalesce(
            status_service_types.service_type_ids,
            '[]'::json
          ),
          'service_type_keys', coalesce(
            status_service_types.service_type_keys,
            '[]'::json
          )
        )
        order by
          pg.sort_order asc,
          pg.name asc,
          ps.sort_order asc,
          ps.name asc
      ),
      '[]'::json
    ) as data

  from public.process_statuses ps

  join public.process_groups pg
    on pg.id = ps.process_group_id

  join public.entity_process_groups epg
    on epg.process_group_id = ps.process_group_id

  left join lateral (
    select
      coalesce(
        json_agg(
          cst.id::text
          order by
            cst.sort_order asc,
            cst.name asc
        ),
        '[]'::json
      ) as service_type_ids,

      coalesce(
        json_agg(
          cst.key
          order by
            cst.sort_order asc,
            cst.name asc
        ),
        '[]'::json
      ) as service_type_keys

    from public.process_status_service_types psst

    join public.client_service_types cst
      on cst.id = psst.service_type_id

    where psst.process_status_id = ps.id
      and cst.is_active = true
  ) status_service_types
    on true

  where epg.entity_key = 'clients'
),

-- =========================================================
-- PLAN OPTIONS
-- =========================================================

plan_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', p.id::text,
          'label', p.name,
          'color', coalesce(p.color, '#64748B')
        )
        order by
          p.sort_order asc,
          p.name asc
      ),
      '[]'::json
    ) as data

  from public.plans p

  where p.name is not null
    and trim(p.name) <> ''
),

-- =========================================================
-- SERVICE TYPE OPTIONS
-- =========================================================

service_type_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', cst.id::text,
          'label', cst.name,
          'key', cst.key
        )
        order by
          cst.sort_order asc,
          cst.name asc
      ),
      '[]'::json
    ) as data

  from public.client_service_types cst

  where cst.is_active = true
),

-- =========================================================
-- CATEGORY COLOR OPTIONS
-- =========================================================

category_color_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', colors.color_hex,
          'label', 'Spalva ' || colors.color_sort_order::text,
          'color', colors.color_hex
        )
        order by colors.color_sort_order
      ),
      '[]'::json
    ) as data

  from (
    select
      cp.sort_order as color_sort_order,
      cp.color_hex

    from public.ui_color_palette cp

    where not exists (
      select 1
      from public.ui_color_registry r
      where r.color_hex = cp.color_hex
    )

    order by
      cp.sort_order asc

    limit 120
  ) colors
),

-- =========================================================
-- USER CATEGORIES
-- =========================================================

categories as (
  select
    cc.id::text as id,
    cc.name,
    coalesce(cc.color, '#64748B') as color,
    cc.created_at

  from public.client_categories cc

  cross join user_context uc

  where cc.team_member_id = uc.team_member_id
     or cc.team_member_id is null
),

-- =========================================================
-- CLIENT DATA
-- =========================================================

clients_data as (
  select
    c.id::text as id,

    -- 1. Pavadinimas
    c.company_name,

    -- 2. Tel.
    c.phone,

    -- 3. Nuoroda
    c.source_url,

    -- 4. Email
    c.email,

    -- 5. Klientas
    c.contact_name,

    -- 6. Priminimas
    c.reminder,

    -- 7. Paslauga
    c.service_type_id::text as service_type_id,
    cst.key as service_type_key,
    cst.name as service_type_name,

    -- 8. Būsena
    c.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    -- 8. Sk
    c.followup_count,

    -- 9. Planas
    c.plan_id::text as plan_id,
    p.name as plan_name,
    coalesce(p.color, '#64748B') as plan_color,

    -- 10. Kaina
    c.price,

    -- 11. Avansas
    coalesce(c.advance_paid, 0) as advance_paid,

    -- 12. Sumokėta
    coalesce(c.advance_paid, 0) as paid_amount,
    coalesce(c.is_paid, false) as is_paid,

    -- 13. Komentaras
    c.production_comment,

    -- 16. Deadline
    c.factory_deadline,

    -- 17. Komentaras po gamybos
    c.post_production_comment,

    -- =====================================================
    -- TECHNINIAI / PAPILDOMI CLIENT FIELDAI
    -- =====================================================

    c.demo_url,
    c.website_url,

    c.team_member_id::text as team_member_id,
    tm.name as team_member_name,

    c.category_id::text as category_id,
    cc.name as category_name,
    coalesce(cc.color, '#64748B') as category_color,

    c.followup_time,
    c.first_called_at,
    c.last_called_at,
    c.call_count,

    -- Drag & drop order within salesperson + category
    c.sort_order,

    -- =====================================================
    -- 14. DEMO
    -- =====================================================

    demo_service.id::text as demo_service_id,
    demo_service.status_id::text as demo_status_id,

    demo_status.name as demo_status_name,

    coalesce(
      demo_status.color,
      '#64748B'
    ) as demo_status_color,

    coalesce(
      demo_service.is_completed,
      false
    ) as demo_is_completed,

    -- =====================================================
    -- 15. WEBSITE
    -- =====================================================

    website_service.id::text as website_service_id,
    website_service.status_id::text as website_status_id,

    website_status.name as website_status_name,

    coalesce(
      website_status.color,
      '#64748B'
    ) as website_status_color,

    coalesce(
      website_service.is_completed,
      false
    ) as website_is_completed,

    -- =====================================================
    -- SYSTEM
    -- =====================================================

    c.created_at,
    c.updated_at,

    coalesce(
      c.is_trashed,
      false
    ) as is_trashed,

    c.trash_reason,
    c.trashed_at

  from public.clients c

  cross join user_context uc

  left join public.client_categories cc
    on cc.id = c.category_id

  left join public.client_service_types cst
    on cst.id = c.service_type_id

  left join public.process_statuses ps
    on ps.id = c.status_id

  left join public.team_members tm
    on tm.id = c.team_member_id

  left join public.plans p
    on p.id = c.plan_id

  -- =====================================================
  -- Naujausias aktyvus DEMO service
  -- =====================================================

  left join lateral (
    select
      s.id,
      s.status_id,
      s.is_completed

    from public.services s

    where s.client_id = c.id
      and s.entity_key = 'demo_services'
      and coalesce(s.is_trashed, false) = false

    order by
      s.created_at desc

    limit 1
  ) demo_service
    on true

  left join public.process_statuses demo_status
    on demo_status.id = demo_service.status_id

  -- =====================================================
  -- Naujausias aktyvus WEBSITE service
  -- =====================================================

  left join lateral (
    select
      s.id,
      s.status_id,
      s.is_completed

    from public.services s

    where s.client_id = c.id
      and s.entity_key = 'website_services'
      and coalesce(s.is_trashed, false) = false

    order by
      s.created_at desc

    limit 1
  ) website_service
    on true

  left join public.process_statuses website_status
    on website_status.id = website_service.status_id

  where coalesce(c.is_trashed, false) = false
    and c.team_member_id = uc.team_member_id

    -- =====================================================
    -- EXCLUDE UNREAD PRODUCTION UPDATES
    -- =====================================================
    --
    -- Kol klientas turi neperskaitytą Demo / Website update,
    -- jis rodomas sales_updates view ir slepiamas iš
    -- pagrindinės sales_clients lentos.
    --
    -- Kai production_update_read_at >= production_updated_at,
    -- klientas vėl grįžta į pagrindinę lentą.
    --
    -- =====================================================

    and c.status_id is distinct from
      '4689c9ba-fba6-4bf9-bdbf-8fd7e756ff99'::uuid
)

-- =========================================================
-- FINAL RESPONSE
-- =========================================================

select

  -- =====================================================
  -- STATUS OPTIONS
  -- =====================================================

  (
    select data
    from client_statuses
  ) as client_statuses,

  -- =====================================================
  -- PLAN OPTIONS
  -- =====================================================

  (
    select data
    from plan_options
  ) as plan_options,

  -- =====================================================
  -- SERVICE TYPE OPTIONS
  -- =====================================================

  (
    select data
    from service_type_options
  ) as service_type_options,

  -- =====================================================
  -- CATEGORY COLOR OPTIONS
  -- =====================================================

  (
    select data
    from category_color_options
  ) as category_color_options,

  -- =====================================================
  -- CATEGORIES
  -- =====================================================

  coalesce(
    (
      select
        json_agg(
          json_build_object(
            'id', cat.id,
            'name', cat.name,
            'color', cat.color,
            'created_at', cat.created_at
          )
          order by
            cat.created_at desc nulls last
        )

      from categories cat
    ),
    '[]'::json
  ) as categories,

  -- =====================================================
  -- CLIENTS
  -- =====================================================

  coalesce(
    (
      select
        json_agg(
          json_build_object(

            -- =================================================
            -- ID
            -- =================================================

            'id', cd.id,

            -- =================================================
            -- 1. Pavadinimas
            -- =================================================

            'company_name',
              cd.company_name,

            -- =================================================
            -- 2. Tel.
            -- =================================================

            'phone',
              cd.phone,

            -- =================================================
            -- 3. Nuoroda
            -- =================================================

            'source_url',
              cd.source_url,

            -- =================================================
            -- 4. Email
            -- =================================================

            'email',
              cd.email,

            -- =================================================
            -- 5. Klientas
            -- =================================================

            'contact_name',
              cd.contact_name,

            -- =================================================
            -- 6. Priminimas
            -- =================================================

            'reminder',
              cd.reminder,

            -- =================================================
            -- 7. Paslauga
            -- =================================================

            'service_type_id',
              cd.service_type_id,

            'service_type_key',
              cd.service_type_key,

            'service_type_name',
              cd.service_type_name,

            -- =================================================
            -- 8. Būsena
            -- =================================================

            'status_id',
              cd.status_id,

            'status_name',
              cd.status_name,

            'status_color',
              cd.status_color,

            -- =================================================
            -- 8. Sk
            -- =================================================

            'followup_count',
              cd.followup_count,

            -- =================================================
            -- 9. Planas
            -- =================================================

            'plan_id',
              cd.plan_id,

            'plan_name',
              cd.plan_name,

            'plan_color',
              cd.plan_color,

            -- =================================================
            -- 10. Kaina
            -- =================================================

            'price',
              cd.price,

            -- =================================================
            -- 11. Avansas
            -- =================================================

            'advance_paid',
              cd.advance_paid,

            -- =================================================
            -- 12. Sumokėta
            -- =================================================

            'paid_amount',
              cd.paid_amount,

            'is_paid',
              cd.is_paid,

            -- =================================================
            -- 13. Komentaras
            -- =================================================

            'production_comment',
              cd.production_comment,

            -- =================================================
            -- 14. Demo
            -- =================================================

            'demo_service_id',
              cd.demo_service_id,

            'demo_status_id',
              cd.demo_status_id,

            'demo_status_name',
              coalesce(
                cd.demo_status_name,
                'Laukia...'
              ),

            'demo_status_color',
              cd.demo_status_color,

            'demo_is_completed',
              cd.demo_is_completed,

            -- =================================================
            -- 15. Svetainė
            -- =================================================

            'website_service_id',
              cd.website_service_id,

            'website_status_id',
              cd.website_status_id,

            'website_status_name',
              coalesce(
                cd.website_status_name,
                'Laukia...'
              ),

            'website_status_color',
              cd.website_status_color,

            'website_is_completed',
              cd.website_is_completed,

            -- =================================================
            -- 16. Deadline
            -- =================================================

            'factory_deadline',
              cd.factory_deadline,

            -- =================================================
            -- 17. Komentaras po gamybos
            -- =================================================

            'post_production_comment',
              cd.post_production_comment,

            -- =================================================
            -- TECHNINIAI FIELDAI GALE
            -- =================================================

            'team_member_id',
              cd.team_member_id,

            'team_member_name',
              cd.team_member_name,

            'category_id',
              cd.category_id,

            'category_name',
              cd.category_name,

            'category_color',
              cd.category_color,

            'demo_url',
              cd.demo_url,

            'website_url',
              cd.website_url,

            'followup_time',
              cd.followup_time,

            'first_called_at',
              cd.first_called_at,

            'last_called_at',
              cd.last_called_at,

            'call_count',
              cd.call_count,

            'sort_order',
              cd.sort_order,

            'created_at',
              cd.created_at,

            'updated_at',
              cd.updated_at,

            'trash_reason',
              cd.trash_reason
          )

          order by
            cd.sort_order asc nulls last,
            cd.created_at desc nulls last,
            cd.id asc
        )

      from clients_data cd
    ),
    '[]'::json
  ) as clients;