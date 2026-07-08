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

  function normalizeOption(option) {
    return {
      value: String(option.value || ""),
      label: String(option.label || ""),
      color: normalizeColor(option.color)
    };
  }

  const clients = ensureArray(input.clients);

  const clientStatuses = ensureArray(input.client_statuses)
    .map(normalizeOption)
    .filter(option => option.value && option.label);

  const statusLabelById = new Map(
    clientStatuses.map(status => [
      String(status.value),
      String(status.label || "")
    ])
  );

  const statusColorById = new Map(
    clientStatuses.map(status => [
      String(status.value),
      normalizeColor(status.color)
    ])
  );

  const rows = clients.map(row => {
    const statusId = String(row.status_id || "");

    return {
      id: row.id,
      company_name: row.company_name || "",
      phone: row.phone || "",
      contact_name: row.contact_name || "",
      email: row.email || "",
      source_url: row.source_url || "",

      demo_url: row.demo_url || "",
      website_url: row.website_url || "",

      status_id: statusId,
      status_name: row.status_name || statusLabelById.get(statusId) || "",
      status_color: normalizeColor(
        row.status_color || statusColorById.get(statusId)
      ),

      followup_count: row.followup_count ?? "",
      followup_time: row.followup_time || "",
      last_called_at: row.last_called_at || "",
      call_count: row.call_count ?? "",
      priority: row.priority || ""
    };
  });

  const columns = [
    {
      key: "source_url",
      label: "Šaltinis",
      field_type: "link",
      editable: false
    },
    {
      key: "company_name",
      label: "Klientas",
      field_type: "text",
      editable: false
    },
    {
      key: "phone",
      label: "Telefonas",
      field_type: "text",
      editable: false
    },
    {
      key: "contact_name",
      label: "Kontaktinis asmuo",
      field_type: "text",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: true,
      options_ref: "client_statuses"
    },
    {
      key: "priority",
      label: "Prioritetas",
      field_type: "text",
      editable: false
    },
    {
      key: "last_called_at",
      label: "Paskutinis skambutis",
      field_type: "datetime",
      editable: false
    },
    {
      key: "demo_url",
      label: "Demo",
      field_type: "link",
      editable: false
    },
    {
      key: "website_url",
      label: "Svetainė",
      field_type: "link",
      editable: false
    }
  ];

  function saveAction(tableKey) {
    return {
      key: "save_table",
      label: "Išsaugoti",
      type: "button",
      placement: "table_header",
      method: "PATCH",
      api_url: "/actions/clients/save",
      target: {
        type: "table",
        key: tableKey
      },
      payload: {
        source: "changeset"
      },
      after_success: {
        type: "refresh_view"
      }
    };
  }

  return {
    version: "ui.v1",
    root: {
      key: "sales_deadline",
      type: "view",
      label: "",
      children: [
        {
          key: "sales_deadline_table",
          type: "table",
          label: "Reikia susisiekti",
          config: {
            primary_key: "id",
            editable: true,
            columns
          },
          data: {
            rows
          },
          actions: [
            saveAction("sales_deadline_table")
          ]
        }
      ]
    },
    resources: {
      client_statuses: {
        type: "options",
        data: clientStatuses
      }
    }
  };
}

module.exports = transformView;