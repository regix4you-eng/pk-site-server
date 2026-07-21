function transformView(input) {
  const FALLBACK_COLOR = "#64748B";

  const SEND_TO_CLIENT_STATUSES = new Set([
    "Demo sukurtas",
    "Demo pakoreguotas",
    "Svetainė padaryta",
    "Svetainė pakoreguota",
    "Dokumentai paruošti",
  ]);

  const PREPARE_DOCUMENTS_STATUSES = new Set([
    "Demo išsiųstas",
    "Svetainė išsiųsta",
  ]);

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
      color: normalizeColor(option?.color),
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
        color: "#2563EB",
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
        color: "#7C3AED",
      };
    }

    if (
      source === "documents" ||
      source === "docs"
    ) {
      return {
        key: "documents",
        label: "Dokumentai",
        color: "#64748B",
      };
    }

    return {
      key: source || "production",
      label: source || "Gamyba",
      color: FALLBACK_COLOR,
    };
  }

  function normalizeServiceType(row) {
    const key = String(
      row.service_type_key || ""
    )
      .trim()
      .toLowerCase();

    const label = String(
      row.service_type_name || ""
    ).trim();

    if (key === "website") {
      return {
        key,
        label: label || "Svetainė",
        color: "#7C3AED",
      };
    }

    if (key === "google_ads") {
      return {
        key,
        label: label || "Google Ads",
        color: "#F59E0B",
      };
    }

    if (key === "commercial_offer") {
      return {
        key,
        label: label || "Komercinis",
        color: "#14B8A6",
      };
    }

    return {
      key,
      label,
      color: FALLBACK_COLOR,
    };
  }

  const clients = ensureArray(input.clients);

  const clientStatuses = ensureArray(
    input.client_statuses
  )
    .map(normalizeOption)
    .filter(
      (option) =>
        option.value &&
        option.label
    );

  const statusLabelById = new Map(
    clientStatuses.map((status) => [
      String(status.value),
      String(status.label || ""),
    ])
  );

  const statusColorById = new Map(
    clientStatuses.map((status) => [
      String(status.value),
      normalizeColor(status.color),
    ])
  );

  const rows = clients.map((row) => {
    const statusId = String(
      row.status_id || ""
    );

    const source = normalizeSource(
      row.production_update_source
    );

    const serviceType =
      normalizeServiceType(row);

    return {
      id: row.id,
      client_id: row.id,

      view_key: "sales_updates",
      entity_type: "client",
      operation: "read",

      serial_number:
        row.serial_number || "",

      service_type_id:
        row.service_type_id || "",

      service_type_key:
        serviceType.key,

      service_type_name:
        serviceType.label,

      service_type_name_color:
        serviceType.color,

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

      google_drive_url:
        row.google_drive_url || "",

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

      demo_url:
        row.demo_url || "",

      website_url:
        row.website_url || "",
    };
  });

  const rowsToSendClient = rows.filter((row) => {
    const hasDriveUrl = String(
      row.google_drive_url || ""
    ).trim();

    if (
      SEND_TO_CLIENT_STATUSES.has(
        row.status_name
      )
    ) {
      return true;
    }

    if (
      PREPARE_DOCUMENTS_STATUSES.has(
        row.status_name
      ) &&
      hasDriveUrl
    ) {
      return true;
    }

    return false;
  });

  const rowsToPrepareDocuments = rows.filter(
    (row) =>
      PREPARE_DOCUMENTS_STATUSES.has(
        row.status_name
      ) &&
      !String(row.google_drive_url || "").trim()
  );

  const columns = [
    {
      key: "serial_number",
      label: "Serijos Nr.",
      field_type: "text",
      editable: false,
    },
    {
      key: "service_type_name",
      label: "Paslauga",
      field_type: "badge",
      editable: false,
    },
    {
      key: "phone",
      label: "Tel.",
      field_type: "text",
      editable: false,
    },
    {
      key: "contact_name",
      label: "Kontaktas",
      field_type: "text",
      editable: false,
    },
    {
      key: "production_update_source_label",
      label: "Šaltinis",
      field_type: "badge",
      editable: false,
    },
    {
      key: "production_updated_by_name",
      label: "Atnaujino",
      field_type: "text",
      editable: false,
    },
    {
      key: "production_updated_at",
      label: "Atnaujinta",
      field_type: "datetime",
      editable: false,
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "client_statuses",
    },
    {
      key: "demo_url",
      label: "Demo",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "",
      },
    },
    {
      key: "website_url",
      label: "Svetainė",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "",
      },
    },
    {
      key: "google_drive_url",
      label: "GDrive",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "—",
      },
    },
  ];

  function sendToClientAction() {
    return {
      key: "send_to_client",
      label: "Siųsti klientui",
      type: "button",
      placement: "row",

      method: "POST",
      api_url: "/documents?action=send",

      payload: {
        source: "row",
      },

      after_success: {
        type: "refresh_view",
      },

      config: {
        variant: "primary",
        color: "#14B8A6",
      },
    };
  }

  function prepareDocumentsAction() {
    return {
      key: "prepare_documents",
      label: "📄 Paruošti dokumentus",
      type: "button",
      placement: "row",

      method: "POST",
      api_url: "/documents?action=prepare",

      payload: {
        source: "row",
      },

      after_success: {
        type: "refresh_view",
      },

      config: {
        variant: "primary",
        color: "#8B5CF6",
      },
    };
  }

  return {
    version: "ui.v1",

    root: {
      key: "sales_updates",
      type: "view",
      label: "",

      children: [
        {
          key: "sales_updates_send_to_client_table",
          type: "table",
          label:
            `Reikia išsiųsti klientui (${rowsToSendClient.length})`,

          config: {
            primary_key: "id",
            editable: false,
            columns,
          },

          data: {
            rows: rowsToSendClient,
          },

          actions: [
            sendToClientAction(),
          ],
        },

        {
          key: "sales_updates_prepare_documents_table",
          type: "table",
          label:
            `Reikia paruošti dokumentus (${rowsToPrepareDocuments.length})`,

          config: {
            primary_key: "id",
            editable: false,
            columns,
          },

          data: {
            rows: rowsToPrepareDocuments,
          },

          actions: [
            prepareDocumentsAction(),
          ],
        },
      ],
    },

    resources: {
      client_statuses: {
        type: "options",
        data: clientStatuses,
      },
    },
  };
}

module.exports = transformView;