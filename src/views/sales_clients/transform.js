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

  const categories = ensureArray(input.categories).map(category => ({
    id: String(category.id || ""),
    name: String(category.name || ""),
    color: normalizeColor(category.color),
    created_at: category.created_at || ""
  }));

  const clientStatuses = ensureArray(input.client_statuses).map(normalizeOption);
  const planOptions = ensureArray(input.plan_options).map(normalizeOption);

  let categoryColorOptions = ensureArray(input.category_color_options).map(option => ({
    value: normalizeColor(option.value || option.color),
    label: String(option.label || option.value || option.color || "Spalva"),
    color: normalizeColor(option.color || option.value)
  }));

  if (!categoryColorOptions.length) {
    categoryColorOptions = [
      {
        value: FALLBACK_COLOR,
        label: "Spalva",
        color: FALLBACK_COLOR
      }
    ];
  }

  const defaultNewCategoryColor =
    categoryColorOptions[0]?.value || FALLBACK_COLOR;

  const uncategorizedColor =
    categoryColorOptions[1]?.value ||
    defaultNewCategoryColor ||
    FALLBACK_COLOR;

  const defaultStatus = clientStatuses.find(status =>
    String(status.label || "").trim().toLowerCase() === "naujas"
  );

  const defaultStatusId = defaultStatus?.value || "";

  function safeKey(value) {
    return String(value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeClient(row) {
    const price = Number(row.price || 0);
    const advancePaid = Number(row.advance_paid || 0);

    const safePrice =
      Number.isFinite(price)
        ? price
        : 0;

    const safeAdvancePaid =
      Number.isFinite(advancePaid)
        ? advancePaid
        : 0;

    const remainingAmount = Math.max(
      safePrice - safeAdvancePaid,
      0
    );

    const paidProgress =
      safePrice > 0
        ? Math.min(
            Math.max(
              (safeAdvancePaid / safePrice) * 100,
              0
            ),
            100
          )
        : 0;

    const calculatedIsPaid =
      safePrice > 0 &&
      safeAdvancePaid >= safePrice;

    return {
      id: row.id,

      company_name: row.company_name || "",
      phone: row.phone || "",
      source_url: row.source_url || "",
      email: row.email || "",
      contact_name: row.contact_name || "",

      reminder: row.reminder || "",

      status_id: row.status_id || "",
      status_name: row.status_name || "",
      status_color: normalizeColor(row.status_color),

      followup_count: row.followup_count ?? "",

      plan_id: row.plan_id || "",
      plan_name: row.plan_name || "",
      plan_color: normalizeColor(row.plan_color),

      price: row.price ?? "",
      advance_paid: row.advance_paid ?? "",

      paid_amount: safeAdvancePaid,
      remaining_amount: remainingAmount,
      paid_progress: paidProgress,

      is_paid:
        typeof row.is_paid === "boolean"
          ? row.is_paid
          : calculatedIsPaid,

      production_comment:
        row.production_comment || "",

      demo_url: row.demo_url || "",
      website_url: row.website_url || "",

      factory_deadline:
        row.factory_deadline || "",

      post_production_comment:
        row.post_production_comment || "",

      followup_time: row.followup_time || "",
      call_count: row.call_count ?? "",

      team_member_name: row.team_member_name || "",

      category_id: row.category_id || "",
      category_name: row.category_name || "",
      category_color: normalizeColor(row.category_color),

      comment: row.comment || "",

      sort_order:
        row.sort_order == null
          ? null
          : Number(row.sort_order),

      created_at: row.created_at || ""
    };
  }

  const categoryMetaColumns = [
    {
      key: "category_name",
      label: "Kategorijos pavadinimas",
      field_type: "text",
      editable: true
    },
    {
      key: "category_color",
      label: "Spalva",
      field_type: "select",
      editable: true,
      options_ref: "category_colors"
    }
  ];

  const clientColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: true
    },
    {
      key: "phone",
      label: "Tel.",
      field_type: "phone",
      editable: true
    },
    {
      key: "source_url",
      label: "Nuoroda",
      field_type: "link",
      editable: true
    },
    {
      key: "email",
      label: "Email",
      field_type: "text",
      editable: true
    },
    {
      key: "contact_name",
      label: "Klientas",
      field_type: "text",
      editable: true
    },
    {
      key: "reminder",
      label: "Priminimas",
      field_type: "text",
      editable: true
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: true,
      options_ref: "client_statuses"
    },
    {
      key: "followup_count",
      label: "Sk",
      field_type: "number",
      editable: true
    },
    {
      key: "plan_id",
      label: "Planas",
      field_type: "select",
      editable: true,
      options_ref: "plan_options"
    },
    {
      key: "price",
      label: "Kaina",
      field_type: "number",
      editable: true
    },
    {
      key: "advance_paid",
      label: "Avansas",
      field_type: "number",
      editable: true
    },
    {
      key: "paid_amount",
      label: "Sumokėta",
      field_type: "number",
      editable: false,
      config: {
        display: "payment_progress",
        price_field: "price",
        paid_field: "advance_paid",
        remaining_field: "remaining_amount",
        progress_field: "paid_progress",
        is_paid_field: "is_paid"
      }
    },
    {
      key: "production_comment",
      label: "Komentaras",
      field_type: "text",
      editable: true,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    },
    {
      key: "demo_url",
      label: "Demo",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "Laukia..."
      }
    },
    {
      key: "website_url",
      label: "Svetainė",
      field_type: "link",
      editable: false,
      config: {
        open_in_new_tab: true,
        empty_label: "Laukia..."
      }
    },
    {
      key: "factory_deadline",
      label: "Deadline",
      field_type: "datetime",
      editable: true
    },
    {
      key: "post_production_comment",
      label: "Komentaras po gamybos",
      field_type: "text",
      editable: true,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    }
  ];

  function addClientAction(categoryId, options = {}) {
    const effect = {
      type: "add_row",
      operation: "create",
      defaults: {
        company_name: "",
        phone: "",
        source_url: "",
        email: "",
        contact_name: "",

        reminder: "",

        price: "",
        advance_paid: "",

        paid_amount: 0,
        remaining_amount: 0,
        paid_progress: 0,
        is_paid: false,

        followup_time: "",

        factory_deadline: "",

        status_id: defaultStatusId,
        followup_count: 0,
        call_count: 0,

        plan_id: "",
        team_member_name: "",

        category_id: categoryId,

        production_comment: "",
        post_production_comment: "",

        comment: "",

        demo_url: "",
        website_url: "",

        created_at: "",

        ...(options.extraDefaults || {})
      }
    };

    if (options.defaultsFrom) {
      effect.defaults_from = options.defaultsFrom;
    }

    return {
      key: "add_client",
      label: "Naujas klientas",
      type: "button",
      placement: "table_header",
      align: "right",
      execution: "local",
      effect
    };
  }

  function deleteClientAction() {
    return {
      key: "delete_row",
      label: "Ištrinti",
      type: "button",
      placement: "row",
      execution: "local",
      effect: {
        type: "mark_row_operation",
        operation: "delete"
      },
      confirm: true
    };
  }

  function deleteCategoryAction(categoryId) {
    return {
      key: `delete_category_${safeKey(categoryId)}`,
      label: "Ištrinti kategoriją",
      type: "button",
      placement: "table_header",
      align: "right",
      method: "DELETE",
      api_url: `/actions/client_categories/delete?category_id=${encodeURIComponent(categoryId)}`,
      confirm: true,
      after_success: {
        type: "refresh_view"
      }
    };
  }

  function buildClientTable(tableKey, categoryId, rows) {
    const actions = [
      addClientAction(categoryId)
    ];

    if (categoryId && categoryId !== "uncategorized") {
      actions.push(deleteCategoryAction(categoryId));
    }

    actions.push(deleteClientAction());

    return {
      key: tableKey,
      type: "table",
      config: {
        primary_key: "id",
        editable: true,

        row_drag: {
          enabled: true,
          order_field: "sort_order"
        },

        autosave: {
          enabled: true,
          trigger: "before_request",
          method: "PATCH",
          api_url: "/actions/clients/save",
          payload: {
            source: "changeset"
          }
        },

        columns: clientColumns
      },

      data: {
        rows
      },

      actions
    };
  }

  function buildTempCategoryMetaTable(
    metaTableKey,
    categoryId
  ) {
    return {
      key: metaTableKey,
      type: "table",
      label: "Kategorija",
      config: {
        primary_key: "id",
        editable: true,
        density: "compact",
        columns: categoryMetaColumns
      },
      data: {
        rows: [
          {
            id: `meta_${categoryId}`,
            category_name: "Nauja kategorija",
            category_color: defaultNewCategoryColor
          }
        ]
      },
      actions: []
    };
  }

  function buildTempCategoryClientTable(
    tableKey,
    categoryId,
    metaTableKey
  ) {
    const categoryContext = [
      {
        type: "table_row",
        table_key: metaTableKey,
        row_index: 0,
        mappings: {
          category_name: "category_name",
          category_color: "category_color"
        }
      }
    ];

    return {
      key: tableKey,
      type: "table",

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
            context_from: categoryContext
          }
        },

        columns: clientColumns
      },

      data: {
        rows: []
      },

      actions: [
        addClientAction(categoryId, {
          extraDefaults: {
            category_name: "Nauja kategorija",
            category_color: defaultNewCategoryColor
          },
          defaultsFrom: categoryContext
        }),
        deleteClientAction()
      ]
    };
  }

  function buildCategoryNode(
    category,
    rows,
    defaultOpen = false
  ) {
    const categoryId = category.id;

    const tableKey =
      `sales_clients_${safeKey(categoryId)}`;

    const sectionKey =
      `${tableKey}_section`;

    const categoryColor =
      normalizeColor(category.color);

    return {
      key: sectionKey,
      type: "collapsible",
      label: category.name || "Be pavadinimo",

      config: {
        default_open: defaultOpen,
        color: categoryColor,

        summary: [
          {
            label: "Klientai",
            value: rows.length
          }
        ]
      },

      data: {
        id: categoryId,
        name: category.name || "",
        color: categoryColor
      },

      children: [
        buildClientTable(
          tableKey,
          categoryId,
          rows
        )
      ]
    };
  }

  function addCategoryAction() {
    return {
      key: "add_category",
      label: "Nauja kategorija",
      type: "button",
      placement: "content_top",
      align: "right",
      execution: "local",

      effect: {
        type: "add_node",
        operation: "create",

        target: {
          type: "view",
          key: "sales_clients",
          path: "children",
          position: "prepend"
        },

        defaults: {
          id_prefix: "tmp_category_",
          label: "Nauja kategorija",
          name: "Nauja kategorija",
          color: defaultNewCategoryColor
        },

        node: {
          key: "sales_clients_{{id}}_section",
          type: "collapsible",
          label: "Nauja kategorija",

          config: {
            default_open: true,
            color: defaultNewCategoryColor,

            summary: [
              {
                label: "Klientai",
                value: 0
              }
            ]
          },

          data: {
            id: "{{id}}",
            name: "Nauja kategorija",
            color: defaultNewCategoryColor,
            operation: "create"
          },

          children: [
            buildTempCategoryMetaTable(
              "sales_category_{{id}}_meta",
              "{{id}}"
            ),

            buildTempCategoryClientTable(
              "sales_clients_{{id}}",
              "{{id}}",
              "sales_category_{{id}}_meta"
            )
          ]
        }
      }
    };
  }

  const rowsByCategory = new Map();

  for (const client of clients) {
    const categoryId =
      client.category_id || "uncategorized";

    if (!rowsByCategory.has(categoryId)) {
      rowsByCategory.set(categoryId, []);
    }

    rowsByCategory
      .get(categoryId)
      .push(normalizeClient(client));
  }

  const categoryNodes = [];

  for (const category of categories) {
    const rows =
      rowsByCategory.get(category.id) || [];

    categoryNodes.push(
      buildCategoryNode(
        category,
        rows,
        false
      )
    );
  }

  const uncategorizedRows =
    rowsByCategory.get("uncategorized") || [];

  if (uncategorizedRows.length > 0) {
    categoryNodes.push(
      buildCategoryNode(
        {
          id: "uncategorized",
          name: "Be kategorijos",
          color: uncategorizedColor
        },
        uncategorizedRows,
        true
      )
    );
  }

  return {
    version: "ui.v1",

    root: {
      key: "sales_clients",
      type: "view",
      label: "Klientai",

      actions: [
        addCategoryAction()
      ],

      children: categoryNodes
    },

    resources: {
      client_statuses: {
        type: "options",
        data: clientStatuses
      },

      plan_options: {
        type: "options",
        data: planOptions
      },

      category_colors: {
        type: "options",
        data: categoryColorOptions
      }
    }
  };
}

module.exports = transformView;