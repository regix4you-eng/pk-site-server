with job_role_options as (
  select
    coalesce(
      json_agg(
        json_build_object(
          'value', jr.id::text,
          'label', jr.name,
          'color', coalesce(jr.color, '#64748B')
        )
        order by d.name, jr.name
      ),
      '[]'::json
    ) as data
  from public.job_roles jr
  left join public.departments d
    on d.id = jr.department_id
),

team_members_data as (
  select
    tm.id::text as id,
    tm.name,
    tm.email,
    tm.phone,

    tm.job_role_id::text as job_role_id,
    jr.name as job_role_name,
    coalesce(jr.color, '#64748B') as job_role_color,

    d.name as department_name,

    tm.auth_user_id::text as auth_user_id,

    tm.created_at,
    tm.updated_at

  from public.team_members tm
  left join public.job_roles jr
    on jr.id = tm.job_role_id
  left join public.departments d
    on d.id = jr.department_id
)

select
  (select data from job_role_options) as job_role_options,

  coalesce(
    (
      select json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'email', t.email,
          'phone', t.phone,

          'job_role_id', t.job_role_id,
          'job_role_name', t.job_role_name,
          'job_role_color', t.job_role_color,

          'department_name', t.department_name,

          'auth_user_id', t.auth_user_id,

          'created_at', t.created_at,
          'updated_at', t.updated_at
        )
        order by t.created_at desc
      )
      from team_members_data t
    ),
    '[]'::json
  ) as team_members;