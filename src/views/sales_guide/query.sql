select
  sg.id::text as id,
  sg.key,
  sg.title,
  sg.subtitle,
  sg.content,
  sg.updated_at,
  tm.name as updated_by_name
from public.sales_guides sg
left join public.team_members tm
  on tm.id = sg.updated_by
where sg.key = 'sales_guide'
limit 1;