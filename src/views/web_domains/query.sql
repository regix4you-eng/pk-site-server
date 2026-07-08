select
  coalesce(
    json_agg(
      json_build_object(
        'id', d.id::text,
        'url', d.url,
        'price', d.price,
        'domain_date', d.domain_date,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      )
      order by
        d.domain_date desc nulls last,
        d.created_at desc nulls last
    ),
    '[]'::json
  ) as domains

from public.domains d;