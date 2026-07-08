function transformView(input) {
  const FALLBACK_COLOR = "#64748B";

  function ensureArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function normalizeColor(value) {
    const color = String(value || "").trim();

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

  const services = ensureArray(input.services);

  const websiteStatuses = ensureArray(input.website_statuses).map(status => ({
    value: String(status.value || ""),
    label: String(status.label || ""),
    color: normalizeColor(status.color)
  }));

  const statusLabelById = new Map(
    websiteStatuses.map(status => [
      String(status.value),
      String(status.label || "")
    ])
  );

  const statusColorById = new Map(
    websiteStatuses.map(status => [
      String(status.value),
      normalizeColor(status.color)
    ])
  );

  function isDone(row) {
    const statusLabel = (statusLabelById.get(String(row.status_id)) || "")
      .trim()
      .toLowerCase();

    return (
      row.is_completed === true ||
      statusLabel === "svetainė padaryta" ||
      statusLabel === "svetainė padaryta ir išsiųsta"
    );
  }

  function mapWebsiteRow(row, sourceUrlMode = "source") {
    const statusId = String(row.status_id || "");

    return {
      id: row.id,
      company_name: row.company_name || row.service_name || "",
      source_url:
        sourceUrlMode === "base44_first"
          ? row.base44_url || row.source_url || ""
          : row.source_url || "",
      status_id: statusId,
      status_name: row.status_name || statusLabelById.get(statusId) || "",
      status_color: normalizeColor(
        row.status_color || statusColorById.get(statusId)
      ),
      comment: row.comment || "",
      completion_comment: row.completion_comment || "",
      deadline: row.deadline || "",
      url: row.url || "",
      email_is_sent: row.email_is_sent === true
    };
  }

  const activeRows = services
    .filter(row => !isDone(row) && !row.is_trashed)
    .map(row => mapWebsiteRow(row, "source"));

  const completedRows = services
    .filter(row => isDone(row) && !row.is_trashed)
    .map(row => mapWebsiteRow(row, "base44_first"));

  const trashRows = services
    .filter(row => row.is_trashed)
    .map(row => {
      const statusId = String(row.status_id || "");

      return {
        id: row.id,
        company_name: row.company_name || row.service_name || "",
        source_url: row.source_url || "",
        status_id: statusId,
        status_name: row.status_name || statusLabelById.get(statusId) || "",
        status_color: normalizeColor(
          row.status_color || statusColorById.get(statusId)
        ),
        trash_reason: row.trash_reason || ""
      };
    });

  const websiteColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false
    },
    {
      key: "source_url",
      label: "Nuoroda",
      field_type: "link",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: true,
      options_ref: "website_statuses"
    },
    {
      key: "deadline",
      label: "Deadline",
      field_type: "date",
      editable: true
    },
    {
      key: "comment",
      label: "Komentaras",
      field_type: "text",
      editable: true,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    },
    {
      key: "url",
      label: "Svetainės link",
      field_type: "link",
      editable: true
    }
  ];

  const completedColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false
    },
    {
      key: "source_url",
      label: "Nuoroda",
      field_type: "link",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "website_statuses"
    },
    {
      key: "completion_comment",
      label: "Užbaigimo komentaras",
      field_type: "text",
      editable: true,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    },
    {
      key: "url",
      label: "Svetainės link",
      field_type: "link",
      editable: true
    },
    {
      key: "email_is_sent",
      label: "Email išsiųstas",
      field_type: "boolean",
      editable: true
    }
  ];

  const trashColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false
    },
    {
      key: "source_url",
      label: "Nuoroda",
      field_type: "link",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "website_statuses"
    },
    {
      key: "trash_reason",
      label: "Priežastis",
      field_type: "text",
      editable: false,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    }
  ];

  return {
    version: "ui.v1",
    root: {
      key: "website",
      type: "view",
      children: [
        {
          key: "website_tabs",
          type: "tabs",
          config: {
            default_child_key: "active"
          },
          children: [
            {
              key: "active",
              type: "tab",
              label: `Darbai (${activeRows.length})`,
              children: [
                {
                  key: "website_active_table",
                  type: "table",
                  config: {
                    primary_key: "id",
                    editable: true,
                    autosave: {
                      enabled: true,
                      trigger: "before_request",
                      method: "PATCH",
                      api_url: "/actions/services/save",
                      payload: {
                        source: "changeset"
                      }
                    },
                    columns: websiteColumns
                  },
                  data: {
                    rows: activeRows
                  },
                  actions: []
                }
              ]
            },
            {
              key: "completed",
              type: "tab",
              label: `Padaryti (${completedRows.length})`,
              children: [
                {
                  key: "website_completed_table",
                  type: "table",
                  config: {
                    primary_key: "id",
                    editable: true,
                    autosave: {
                      enabled: true,
                      trigger: "before_request",
                      method: "PATCH",
                      api_url: "/actions/services/save",
                      payload: {
                        source: "changeset"
                      }
                    },
                    columns: completedColumns
                  },
                  data: {
                    rows: completedRows
                  },
                  actions: []
                }
              ]
            },
            {
              key: "trash",
              type: "tab",
              label: `Šiukšlinė (${trashRows.length})`,
              children: [
                {
                  key: "website_trash_table",
                  type: "table",
                  config: {
                    primary_key: "id",
                    editable: false,
                    columns: trashColumns
                  },
                  data: {
                    rows: trashRows
                  },
                  actions: []
                }
              ]
            }
          ]
        }
      ]
    },
    resources: {
      website_statuses: {
        type: "options",
        data: websiteStatuses
      }
    }
  };
}

module.exports = transformView;