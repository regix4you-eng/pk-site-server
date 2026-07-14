const FALLBACK_COLOR = '#64748B';

function ensureArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeColor(value) {
  const color = String(value || '').trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  if (/^rgb\(/i.test(color)) {
    return color;
  }

  if (/^hsl\(/i.test(color)) {
    return color;
  }

  return FALLBACK_COLOR;
}

function transformDemoView(input) {
  const services = ensureArray(input.services);

  const demoStatuses = ensureArray(
    input.demo_statuses
  ).map((status) => ({
    value: String(status.value || ''),
    label: String(status.label || ''),
    color: normalizeColor(status.color),
  }));

  const statusLabelById = new Map(
    demoStatuses.map((status) => [
      String(status.value),
      String(status.label || ''),
    ])
  );

  const statusColorById = new Map(
    demoStatuses.map((status) => [
      String(status.value),
      normalizeColor(status.color),
    ])
  );

  function isDone(row) {
    const statusLabel =
      statusLabelById.get(
        String(row.status_id)
      ) || '';

    return (
      row.is_completed === true ||
      statusLabel.toLowerCase() === 'demo sukurtas'
    );
  }

  function mapServiceRow(row) {
    const statusId = String(
      row.status_id || ''
    );

    return {
      id: row.id,

      company_name:
        row.company_name ||
        row.service_name ||
        '',

      source_url:
        row.source_url || '',

      base44_url:
        row.base44_url || '',

      base44_prompt:
        row.base44_prompt || '',

      status_id:
        statusId,

      status_name:
        row.status_name ||
        statusLabelById.get(statusId) ||
        '',

      status_color:
        normalizeColor(
          row.status_color ||
          statusColorById.get(statusId)
        ),

      comment:
        row.comment || '',

      completion_comment:
        row.completion_comment || '',

      url:
        row.url || '',
    };
  }

  const activeRows = services
    .filter(
      (row) =>
        !isDone(row) &&
        !row.is_trashed
    )
    .map(mapServiceRow);

  const completedRows = services
    .filter(
      (row) =>
        isDone(row) &&
        !row.is_trashed
    )
    .map(mapServiceRow);

  const trashRows = services
    .filter((row) => row.is_trashed)
    .map((row) => {
      const statusId = String(
        row.status_id || ''
      );

      return {
        id: row.id,

        company_name:
          row.company_name ||
          row.service_name ||
          '',

        source_url:
          row.source_url || '',

        status_id:
          statusId,

        status_name:
          row.status_name ||
          statusLabelById.get(statusId) ||
          '',

        status_color:
          normalizeColor(
            row.status_color ||
            statusColorById.get(statusId)
          ),

        trash_reason:
          row.trash_reason || '',
      };
    });

  const demoColumns = [
    {
      key: 'company_name',
      label: 'Pavadinimas',
      field_type: 'text',
      editable: false,
    },
    {
      key: 'source_url',
      label: 'Nuoroda',
      field_type: 'link',
      editable: false,
    },
    {
      key: 'status_id',
      label: 'Būsena',
      field_type: 'select',
      editable: true,
      options_ref: 'demo_statuses',
    },
    {
      key: 'comment',
      label: 'Komentaras',
      field_type: 'text',
      editable: true,
      config: {
        display: 'truncate',
        overflow: 'popover',
      },
    },
    {
      key: 'base44_prompt',
      label: 'Paruoštas Promptas',
      field_type: 'text',
      editable: true,
      config: {
        display: 'truncate',
        overflow: 'popover',
      },
    },
    {
      key: 'completion_comment',
      label: 'Komentaras po gamybos',
      field_type: 'text',
      editable: true,
      config: {
        display: 'truncate',
        overflow: 'popover',
      },
    },
    {
      key: 'base44_url',
      label: 'Gamybos nuoroda',
      field_type: 'link',
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: 'Laukia...',
      },
    },
    {
      key: 'url',
      label: 'Demo link',
      field_type: 'link',
      editable: true,
    },
  ];

  const trashColumns = [
    {
      key: 'company_name',
      label: 'Pavadinimas',
      field_type: 'text',
      editable: false,
    },
    {
      key: 'source_url',
      label: 'Nuoroda',
      field_type: 'link',
      editable: false,
    },
    {
      key: 'status_id',
      label: 'Būsena',
      field_type: 'select',
      editable: false,
      options_ref: 'demo_statuses',
    },
    {
      key: 'trash_reason',
      label: 'Priežastis',
      field_type: 'text',
      editable: false,
      config: {
        display: 'truncate',
        overflow: 'popover',
      },
    },
  ];

  const servicesAutosave = {
    enabled: true,
    trigger: 'before_request',
    method: 'PATCH',
    api_url: '/actions/services/save',
    payload: {
      source: 'changeset',
    },
  };

  return {
    version: 'ui.v1',

    root: {
      key: 'demo',
      type: 'view',

      children: [
        {
          key: 'demo_tabs',
          type: 'tabs',

          config: {
            default_child_key: 'active',
          },

          children: [
            {
              key: 'active',
              type: 'tab',
              label: `Darbai (${activeRows.length})`,

              children: [
                {
                  key: 'demo_active_table',
                  type: 'table',

                  config: {
                    primary_key: 'id',
                    editable: true,

                    autosave: {
                      ...servicesAutosave,
                    },

                    columns: demoColumns,
                  },

                  data: {
                    rows: activeRows,
                  },

                  actions: [],
                },
              ],
            },

            {
              key: 'completed',
              type: 'tab',
              label: `Padaryti (${completedRows.length})`,

              children: [
                {
                  key: 'demo_completed_table',
                  type: 'table',

                  config: {
                    primary_key: 'id',
                    editable: true,

                    autosave: {
                      ...servicesAutosave,
                    },

                    columns: demoColumns,
                  },

                  data: {
                    rows: completedRows,
                  },

                  actions: [],
                },
              ],
            },

            {
              key: 'trash',
              type: 'tab',
              label: `Šiukšlinė (${trashRows.length})`,

              children: [
                {
                  key: 'demo_trash_table',
                  type: 'table',

                  config: {
                    primary_key: 'id',
                    editable: false,
                    columns: trashColumns,
                  },

                  data: {
                    rows: trashRows,
                  },

                  actions: [],
                },
              ],
            },
          ],
        },
      ],
    },

    resources: {
      demo_statuses: {
        type: 'options',
        data: demoStatuses,
      },
    },
  };
}

module.exports = transformDemoView;