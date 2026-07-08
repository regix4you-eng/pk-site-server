function transformView(input) {
  const FALLBACK_COLOR = "#64748B";


  // =========================================================
  // HELPERS
  // =========================================================

  function ensureArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
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
      value: String(option?.value || ""),
      label: String(option?.label || ""),
      color: normalizeColor(option?.color)
    };
  }


  function normalizeSource(value) {
    const source = String(value || "")
      .trim()
      .toLowerCase();

    if (
      source === "demo" ||
      source === "demo_services"
    ) {
      return {
        key: "demo",
        label: "Demo",
        color: "#2563EB"
      };
    }

    if (
      source === "website" ||
      source === "web" ||
      source === "website_services"
    ) {
      return {
        key: "website",
        label: "Svetainė",
        color: "#7C3AED"
      };
    }

    return {
      key: source || "production",
      label: source || "Gamyba",
      color: FALLBACK_COLOR
    };
  }


  // =========================================================
  // DATA
  // =========================================================

  const clients = ensureArray(input.clients);

  const clientStatuses = ensureArray(input.client_statuses)
    .map(normalizeOption)
    .filter(option =>
      option.value &&
      option.label
    );


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
    const statusId = String(
      row.status_id || ""
    );

    const source = normalizeSource(
      row.production_update_source
    );

    return {
      id: row.id,

      // =====================================================
      // ACTION REQUEST TECHNICAL CONTEXT
      // =====================================================

      view_key: "sales_updates",
      entity_type: "client",
      operation: "read",

      // =====================================================
      // CLIENT
      // =====================================================

      company_name:
        row.company_name || "",

      contact_name:
        row.contact_name || "",

      phone:
        row.phone || "",

      email:
        row.email || "",

      source_url:
        row.source_url || "",

      // =====================================================
      // CLIENT STATUS
      // =====================================================

      status_id:
        statusId,

      status_name:
        row.status_name ||
        statusLabelById.get(statusId) ||
        "",

      status_color:
        normalizeColor(
          row.status_color ||
          statusColorById.get(statusId) ||
          FALLBACK_COLOR
        ),

      // =====================================================
      // PRODUCTION UPDATE
      // =====================================================

      production_update_source:
        source.key,

      production_update_source_label:
        source.label,

      production_update_source_label_color:
        source.color,

      production_updated_at:
        row.production_updated_at || "",

      production_update_read_at:
        row.production_update_read_at || "",

      production_updated_by_team_member_id:
        row.production_updated_by_team_member_id || "",

      production_updated_by_name:
        row.production_updated_by_name || "",

      // =====================================================
      // URLS
      // =====================================================

      demo_url:
        row.demo_url || "",

      website_url:
        row.website_url || ""
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
      key: "contact_name",
      label: "Kontaktas",
      field_type: "text",
      editable: false
    },

    {
      key: "production_update_source_label",
      label: "Šaltinis",
      field_type: "badge",
      editable: false
    },

    {
      key: "production_updated_by_name",
      label: "Atnaujino",
      field_type: "text",
      editable: false
    },

    {
      key: "production_updated_at",
      label: "Atnaujinta",
      field_type: "datetime",
      editable: false
    },

    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "client_statuses"
    },

    {
      key: "demo_url",
      label: "Demo",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: ""
      }
    },

    {
      key: "website_url",
      label: "Svetainė",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: ""
      }
    }
  ];


  // =========================================================
  // ACTION
  // =========================================================

  function openUpdateAction() {
    return {
      key: "open_update",
      label: "Patvirtinti",
      type: "button",
      placement: "row",

      method: "PATCH",
      api_url: "/actions/sales/accept",

      payload: {
        source: "row"
      },

      after_success: {
        type: "refresh_view"
      }
    };
  }


  // =========================================================
  // RESPONSE
  // =========================================================

  return {
    version: "ui.v1",

    root: {
      key: "sales_updates",
      type: "view",
      label: "",

      children: [
        {
          key: "sales_updates_table",
          type: "table",
          label: `Neperskaityti atnaujinimai (${rows.length})`,

          config: {
            primary_key: "id",
            editable: false,
            columns
          },

          data: {
            rows
          },

          actions: [
            openUpdateAction()
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