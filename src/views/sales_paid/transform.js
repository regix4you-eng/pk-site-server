function transformView(input) {
  const FALLBACK_COLOR = "#64748B";

  function ensureArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) return value;

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
      value: String(option.value || ""),
      label: String(option.label || ""),
      color: normalizeColor(option.color),
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

  const neutralClientStatuses =
    clientStatuses.map((status) => ({
      value: status.value,
      label: status.label,
    }));

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

    return {
      id: row.id,

      company_name:
        row.company_name || "",

      contact_name:
        row.contact_name || "",

      phone:
        row.phone || "",

      source_url:
        row.source_url || "",

      status_id:
        statusId,

      status_name:
        row.status_name ||
        statusLabelById.get(statusId) ||
        "",

      status_color:
        normalizeColor(
          row.status_color ||
          statusColorById.get(statusId)
        ),

      price:
        row.price ?? "",

      advance_paid:
        row.advance_paid ?? "",

      paid_amount:
        row.paid_amount ??
        row.advance_paid ??
        "",

      is_paid:
        typeof row.is_paid === "boolean"
          ? row.is_paid
          : false,

      website_url:
        row.website_url || "",

      post_production_comment:
        row.post_production_comment || "",

      email:
        row.email || "",

      plan_id:
        row.plan_id || "",

      plan_name:
        row.plan_name || "",

      plan_color:
        normalizeColor(row.plan_color),

      category_id:
        row.category_id || "",

      category_name:
        row.category_name || "",

      category_color:
        normalizeColor(row.category_color),

      team_member_id:
        row.team_member_id || "",

      team_member_name:
        row.team_member_name || "",

      followup_count:
        row.followup_count ?? "",

      followup_time:
        row.followup_time || "",

      first_called_at:
        row.first_called_at || "",

      last_called_at:
        row.last_called_at || "",

      call_count:
        row.call_count ?? "",

      created_at:
        row.created_at || "",

      updated_at:
        row.updated_at || "",
    };
  });

  const columns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false,
    },
    {
      key: "contact_name",
      label: "Klientas",
      field_type: "text",
      editable: false,
    },
    {
      key: "phone",
      label: "Tel.",
      field_type: "text",
      editable: false,
    },
    {
      key: "source_url",
      label: "Nuoroda",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "",
      },
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: true,
      options_ref: "client_statuses_neutral",
    },
    {
      key: "paid_amount",
      label: "Sumokėta",
      field_type: "number",
      editable: false,
    },
    {
      key: "website_url",
      label: "Svetainė",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "Laukia...",
      },
    },
    {
      key: "post_production_comment",
      label: "Komentaras po gamybos",
      field_type: "text",
      editable: true,
      config: {
        display: "truncate",
        overflow: "popover",
      },
    },
  ];

  function trashClientAction() {
    return {
      key: "delete_row",
      label: "Ištrinti",
      type: "button",
      placement: "row",

      execution: "local",

      effect: {
        type: "mark_row_operation",
        operation: "delete",
      },

      confirm: true,
    };
  }

  return {
    version: "ui.v1",

    root: {
      key: "sales_paid",
      type: "view",
      label: "",

      children: [
        {
          key: "sales_paid_table",
          type: "table",

          label:
            `Apmokėti klientai (${rows.length})`,

          config: {
            primary_key: "id",
            editable: true,

            autosave: {
              enabled: true,
              trigger: "before_request",
              method: "PATCH",
              api_url: "/actions/clients/save",

              payload: {
                source: "changeset",
              },
            },

            columns,
          },

          data: {
            rows,
          },

          actions: [
            trashClientAction(),
          ],
        },
      ],
    },

    resources: {
      client_statuses: {
        type: "options",
        data: clientStatuses,
      },

      client_statuses_neutral: {
        type: "options",
        data: neutralClientStatuses,
      },
    },
  };
}

module.exports = transformView;