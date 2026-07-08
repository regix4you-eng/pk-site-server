with user_context as (
  select
    tm.id as team_member_id,
    tm.name as team_member_name,
    jr.name as role_name,
    d.name as department_name,
    case
      when d.name = 'director' then true
      else false
    end as is_director
  from public.team_members tm
  join public.job_roles jr
    on jr.id = tm.job_role_id
  join public.departments d
    on d.id = jr.department_id
  where tm.id = $1::uuid
  limit 1
),

payments_data as (
  select
    p.id::text as id,

    p.direction::text as direction,

    p.amount,

    p.payment_type_id::text as payment_type_id,
    pt.key as payment_type_key,
    pt.label as payment_type_label,
    coalesce(pt.color, '#64748B') as payment_type_color,
    coalesce(pt.is_director_only, false) as payment_type_is_director_only,

    p.comment,

    p.client_id::text as client_id,
    c.phone as client_phone,
    c.company_name as client_name,

    p.team_member_id::text as team_member_id,
    tm.name as team_member_name,

    p.paid_at,
    p.created_at

  from public.payments p
  left join public.payment_types pt
    on pt.id = p.payment_type_id
  left join public.clients c
    on c.id = p.client_id
  left join public.team_members tm
    on tm.id = p.team_member_id
  cross join user_context uc
  where
    uc.is_director = true
    or p.team_member_id = uc.team_member_id
),

payment_type_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', pt.id::text,
          'label', pt.label,
          'key', pt.key,
          'color', coalesce(pt.color, '#64748B'),
          'is_director_only', coalesce(pt.is_director_only, false)
        )
        order by
          pt.sort_order asc,
          pt.label asc
      ),
      '[]'::json
    ) as data
  from public.payment_types pt
  cross join user_context uc
  where coalesce(pt.is_active, true) = true
    and (
      coalesce(pt.is_director_only, false) = false
      or uc.is_director = true
    )
),

client_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', c.id::text,
          'label', coalesce(
            nullif(c.phone, ''),
            nullif(c.company_name, ''),
            nullif(c.contact_name, ''),
            nullif(c.email, ''),
            'Be numerio'
          )
        )
        order by
          regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') asc,
          c.created_at desc
      ),
      '[]'::json
    ) as data
  from public.clients c
  cross join user_context uc
  where coalesce(c.is_trashed, false) = false
    and (
      uc.is_director = true
      or c.team_member_id = uc.team_member_id
    )
),

team_member_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', tm.id::text,
          'label', tm.name
        )
        order by tm.name
      ),
      '[]'::json
    ) as data
  from public.team_members tm
  cross join user_context uc
  where
    uc.is_director = true
    or tm.id = uc.team_member_id
)

select
  (
    select coalesce(
      json_agg(
        json_build_object(
          'id', pd.id,

          'direction', pd.direction,

          'amount', pd.amount,

          'payment_type_id', pd.payment_type_id,
          'payment_type_key', pd.payment_type_key,
          'payment_type_label', pd.payment_type_label,
          'payment_type_color', pd.payment_type_color,
          'payment_type_is_director_only', pd.payment_type_is_director_only,

          'comment', pd.comment,

          'client_id', pd.client_id,
          'client_phone', pd.client_phone,
          'client_name', pd.client_name,

          'team_member_id', pd.team_member_id,
          'team_member_name', pd.team_member_name,

          'paid_at', pd.paid_at,
          'created_at', pd.created_at
        )
        order by
          pd.paid_at desc,
          pd.created_at desc
      ),
      '[]'::json
    )
    from payments_data pd
  ) as payments,

  (select data from payment_type_options) as payment_type_options,
  (select data from client_options) as client_options,
  (select data from team_member_options) as team_member_options,

  (select team_member_id::text from user_context) as current_team_member_id,
  (select is_director from user_context) as is_director;