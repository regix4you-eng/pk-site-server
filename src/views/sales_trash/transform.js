function transformView(input) {
  const FALLBACK_COLOR = "#64748B";

  function ensureArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

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


  // =========================================================
  // DATA
  // =========================================================

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


  // =========================================================
  // ROWS
  // =========================================================

  const rows = clients.map(row => {
    const statusId = String(row.status_id || "");

    return {
      id: row.id,

      // Bendram /actions/restore endpointui
      entity_type: "client",
      operation: "restore",

      company_name: row.company_name || "",
      contact_name: row.contact_name || "",
      phone: row.phone || "",
      email: row.email || "",
      source_url: row.source_url || "",

      status_id: statusId,

      status_name:
        row.status_name ||
        statusLabelById.get(statusId) ||
        "",

      status_color: normalizeColor(
        row.status_color ||
        statusColorById.get(statusId) ||
        FALLBACK_COLOR
      ),

      trash_reason:
        row.trash_reason ||
        "Ištrinta rankiniu būdu",

      trashed_at:
        row.trashed_at || ""
    };
  });


  // =========================================================
  // COLUMNS
  // =========================================================

  const columns = [
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
      key: "email",
      label: "Email",
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
      key: "trash_reason",
      label: "Priežastis",
      field_type: "text",
      editable: false,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    },
    {
      key: "trashed_at",
      label: "Ištrinta",
      field_type: "datetime",
      editable: false
    },
    {
      key: "source_url",
      label: "Šaltinis",
      field_type: "link",
      editable: false
    }
  ];


  // =========================================================
  // RESTORE ACTION
  // =========================================================

  function restoreClientAction() {
    return {
      key: "restore_row",
      label: "Grąžinti",
      type: "button",
      placement: "row",

      method: "PATCH",
      api_url: "/actions/restore",

      payload: {
        source: "row"
      },

      confirm: true
    };
  }


  // =========================================================
  // RESPONSE
  // =========================================================

  return {
    version: "ui.v1",

    root: {
      key: "sales_trash",
      type: "view",
      label: "",

      children: [
        {
          key: "sales_trash_table",
          type: "table",
          label: `Ištrinti klientai (${rows.length})`,

          config: {
            primary_key: "id",
            editable: true,

            autosave: {
              enabled: true,
              trigger: "before_request",
              method: "PATCH",
              api_url: "/actions/clients/save",

              payload: {
                source: "changeset"
              }
            },

            columns
          },

          data: {
            rows
          },

          actions: [
            restoreClientAction()
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