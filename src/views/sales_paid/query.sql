with client_statuses as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', ps.id::text,
          'label', ps.name,
          'color', coalesce(ps.color, '#64748B')
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

  where epg.entity_key = 'clients'
),

paid_clients as (
  select
    c.id::text as id,

    -- 1. Pavadinimas
    c.company_name,

    -- 2. Klientas
    c.contact_name,

    -- 3. Sąskaita / techninis esamas laukas
    c.source_url,

    -- 4. Būsena
    c.status_id::text as status_id,
    ps.name as status_name,
    coalesce(ps.color, '#64748B') as status_color,

    -- 5. Kaina
    c.price,

    -- 6. Avansas
    coalesce(c.advance_paid, 0) as advance_paid,

    -- 7. Sumokėta
    coalesce(c.advance_paid, 0) as paid_amount,
    coalesce(c.is_paid, false) as is_paid,

    -- 8. Svetainė
    c.website_url,

    -- =====================================================
    -- Papildomi techniniai fieldai
    -- =====================================================

    c.phone,
    c.email,

    c.plan_id::text as plan_id,
    p.name as plan_name,
    coalesce(p.color, '#64748B') as plan_color,

    c.team_member_id::text as team_member_id,
    tm.name as team_member_name,

    c.category_id::text as category_id,
    cc.name as category_name,
    coalesce(cc.color, '#64748B') as category_color,

    c.followup_count,
    c.followup_time,
    c.first_called_at,
    c.last_called_at,
    c.call_count,

    c.created_at,
    c.updated_at

  from public.clients c

  join public.process_statuses ps
    on ps.id = c.status_id

  left join public.plans p
    on p.id = c.plan_id

  left join public.team_members tm
    on tm.id = c.team_member_id

  left join public.client_categories cc
    on cc.id = c.category_id

  where coalesce(c.is_trashed, false) = false

    and c.team_member_id =
      $1::uuid

    and ps.name = 'Sumokėta'
)

select
  (
    select data
    from client_statuses
  ) as client_statuses,

  coalesce(
    (
      select
        json_agg(
          json_build_object(

            -- ID
            'id', pc.id,

            -- 1. Pavadinimas
            'company_name',
              pc.company_name,

            -- 2. Klientas
            'contact_name',
              pc.contact_name,

            -- 3. Sąskaita
            -- Kol kas paliktas esamas source_url fieldas.
            -- View JS parodys tikrą mappingą.
            'source_url',
              pc.source_url,

            -- 4. Būsena
            'status_id',
              pc.status_id,

            'status_name',
              pc.status_name,

            'status_color',
              pc.status_color,

            -- 5. Kaina
            'price',
              pc.price,

            -- 6. Avansas
            'advance_paid',
              pc.advance_paid,

            -- 7. Sumokėta
            'paid_amount',
              pc.paid_amount,

            'is_paid',
              pc.is_paid,

            -- 8. Svetainė
            'website_url',
              pc.website_url,

            -- =================================================
            -- Techniniai fieldai gale
            -- =================================================

            'phone',
              pc.phone,

            'email',
              pc.email,

            'plan_id',
              pc.plan_id,

            'plan_name',
              pc.plan_name,

            'plan_color',
              pc.plan_color,

            'team_member_id',
              pc.team_member_id,

            'team_member_name',
              pc.team_member_name,

            'category_id',
              pc.category_id,

            'category_name',
              pc.category_name,

            'category_color',
              pc.category_color,

            'followup_count',
              pc.followup_count,

            'followup_time',
              pc.followup_time,

            'first_called_at',
              pc.first_called_at,

            'last_called_at',
              pc.last_called_at,

            'call_count',
              pc.call_count,

            'created_at',
              pc.created_at,

            'updated_at',
              pc.updated_at
          )

          order by
            pc.updated_at desc nulls last,
            pc.created_at desc
        )

      from paid_clients pc
    ),
    '[]'::json
  ) as clients;