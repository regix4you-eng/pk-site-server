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
      key: option.key ? String(option.key) : undefined,
      color: option.color ? normalizeColor(option.color) : undefined,
      is_director_only: option.is_director_only === true
    };
  }

  const payments = ensureArray(input.payments);

  const paymentTypeOptions = ensureArray(input.payment_type_options)
    .map(normalizeOption)
    .filter(option => option.value && option.label);

  const clientOptionsNeutral = ensureArray(input.client_options)
    .map(option => ({
      value: String(option.value || ""),
      label: String(option.label || "")
    }))
    .filter(option => option.value && option.label);

  const teamMemberOptions = ensureArray(input.team_member_options)
    .map(option => ({
      value: String(option.value || ""),
      label: String(option.label || "")
    }))
    .filter(option => option.value && option.label);

  const currentTeamMemberId = input.current_team_member_id || "";
  const isDirector = input.is_director === true;

  const paymentDirectionOptions = [
    {
      value: "income",
      label: "Pajamos",
      color: "#14B8A6"
    },
    {
      value: "expense",
      label: "Išlaidos",
      color: "#EF4444"
    }
  ];

  const defaultPaymentType =
    paymentTypeOptions.find(option => option.key === "avansas") ||
    paymentTypeOptions[0] ||
    null;

  const defaultPaymentTypeId = defaultPaymentType?.value || "";

  const paymentTypeLabelById = new Map(
    paymentTypeOptions.map(option => [
      String(option.value),
      String(option.label || "")
    ])
  );

  const paymentTypeColorById = new Map(
    paymentTypeOptions.map(option => [
      String(option.value),
      normalizeColor(option.color)
    ])
  );

  const rows = payments.map(row => {
    const paymentTypeId = String(row.payment_type_id || "");

    return {
      id: row.id,

      direction: row.direction || "income",

      amount: row.amount ?? "",

      payment_type_id: paymentTypeId,
      payment_type_key: row.payment_type_key || "",
      payment_type_label: row.payment_type_label || paymentTypeLabelById.get(paymentTypeId) || "",
      payment_type_color: normalizeColor(row.payment_type_color || paymentTypeColorById.get(paymentTypeId)),
      payment_type_is_director_only: row.payment_type_is_director_only === true,

      client_id: row.client_id || "",
      client_phone: row.client_phone || "",
      client_name: row.client_name || "",

      team_member_id: row.team_member_id || currentTeamMemberId,
      team_member_name: row.team_member_name || "",

      comment: row.comment || "",

      paid_at: row.paid_at || "",
      created_at: row.created_at || ""
    };
  });

  const columns = [
    {
      key: "direction",
      label: "Kryptis",
      field_type: "select",
      editable: true,
      options_ref: "payment_directions",
      config: {
        use_option_colors: true,
        show_option_dot: true
      }
    },
    {
      key: "amount",
      label: "Suma",
      field_type: "number",
      editable: true
    },
    {
      key: "payment_type_id",
      label: "Tipas",
      field_type: "select",
      editable: true,
      options_ref: "payment_types",
      config: {
        use_option_colors: true,
        show_option_dot: true,
        color_field: "payment_type_color"
      }
    },
    {
      key: "client_id",
      label: "Kliento numeris",
      field_type: "select",
      editable: true,
      options_ref: "client_options_neutral",
      config: {
        use_option_colors: false
      }
    },
    {
      key: "team_member_id",
      label: "Atsakingas",
      field_type: "select",
      editable: isDirector,
      options_ref: "team_member_options",
      config: {
        use_option_colors: false
      }
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
      key: "paid_at",
      label: "Data",
      field_type: "datetime",
      editable: true
    },
    {
      key: "created_at",
      label: "Sukurta",
      field_type: "datetime",
      editable: false
    }
  ];

  function addPaymentAction() {
    return {
      key: "add_payment",
      label: "Pridėti mokėjimą",
      type: "button",
      placement: "table_header",
      align: "right",
      execution: "local",
      effect: {
        type: "add_row",
        operation: "create",
        defaults: {
          direction: "income",
          amount: "",
          payment_type_id: defaultPaymentTypeId,
          client_id: "",
          team_member_id: currentTeamMemberId,
          comment: "",
          paid_at: "",
          created_at: ""
        }
      }
    };
  }

  function savePaymentsAction() {
    return {
      key: "save_table",
      label: "Išsaugoti",
      type: "button",
      placement: "table_header",
      align: "right",
      method: "PATCH",
      api_url: "/actions/payments/save",
      target: {
        type: "table",
        key: "payments_table"
      },
      payload: {
        source: "changeset"
      },
      after_success: {
        type: "refresh_view"
      }
    };
  }

  function deletePaymentAction() {
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

  return {
    version: "ui.v1",
    root: {
      key: "payments",
      type: "view",
      label: "Apmokėjimai",
      children: [
        {
          key: "payments_table",
          type: "table",
          config: {
            primary_key: "id",
            editable: true,
            columns
          },
          data: {
            rows
          },
          actions: [
            addPaymentAction(),
            savePaymentsAction(),
            deletePaymentAction()
          ]
        }
      ]
    },
    resources: {
      payment_directions: {
        type: "options",
        data: paymentDirectionOptions
      },
      payment_types: {
        type: "options",
        data: paymentTypeOptions
      },
      client_options_neutral: {
        type: "options",
        data: clientOptionsNeutral
      },
      team_member_options: {
        type: "options",
        data: teamMemberOptions
      }
    }
  };
}

module.exports = transformView;