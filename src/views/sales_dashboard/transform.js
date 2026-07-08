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

  function ensureObject(value) {
    if (!value) return {};

    if (typeof value === "object" && !Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  function normalizeColor(value) {
    const color = String(value || "").trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
    if (/^rgb\(/i.test(color)) return color;
    if (/^hsl\(/i.test(color)) return color;

    return FALLBACK_COLOR;
  }

  function moneyNoDecimals(value) {
    const number = Number(value || 0);

    return `${new Intl.NumberFormat("lt-LT", {
      maximumFractionDigits: 0
    }).format(number)}€`;
  }

  function moneyTwoDecimals(value) {
    const number = Number(value || 0);

    return `${new Intl.NumberFormat("lt-LT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number)}€`;
  }

  function numberValue(value) {
    return new Intl.NumberFormat("lt-LT").format(Number(value || 0));
  }

  function normalizeOption(option) {
    return {
      value: String(option.value || ""),
      label: String(option.label || ""),
      color: normalizeColor(option.color)
    };
  }

  const kpis = ensureObject(input.kpis);

  const todayCalls = ensureArray(input.today_calls);
  const hotClients = ensureArray(input.hot_clients);

  const clientStatuses = ensureArray(input.client_statuses)
    .map(normalizeOption)
    .filter(option => option.value && option.label);

  const todayCallRows = todayCalls.map(row => ({
    id: row.id,

    company_name: row.company_name || "",
    contact_name: row.contact_name || "",
    phone: row.phone || "",
    email: row.email || "",
    source_url: row.source_url || "",

    status_id: row.status_id || "",
    status_name: row.status_name || "",
    status_color: normalizeColor(row.status_color),

    sk_count: row.sk_count ?? 0,
    followup_count: row.followup_count ?? 0,
    followup_time: row.followup_time || "",
    last_called_at: row.last_called_at || "",
    call_count: row.call_count ?? 0,

    reminder: row.reminder || "",

    priority: row.priority || "",
    priority_color: normalizeColor(row.priority_color)
  }));

  const hotClientRows = hotClients.map(row => ({
    id: row.id,

    company_name: row.company_name || "",
    contact_name: row.contact_name || "",
    phone: row.phone || "",
    email: row.email || "",
    source_url: row.source_url || "",

    status_id: row.status_id || "",
    status_name: row.status_name || "",
    status_color: normalizeColor(row.status_color),

    sent_at: row.sent_at || "",

    price: row.price ?? "",
    advance_paid: row.advance_paid ?? ""
  }));

  const todayCallsColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false
    },
    {
      key: "phone",
      label: "Tel.",
      field_type: "text",
      editable: false
    },
    {
      key: "contact_name",
      label: "Kliento vardas",
      field_type: "text",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "client_statuses",
      config: {
        use_option_colors: true,
        show_option_dot: true,
        color_field: "status_color"
      }
    },
    {
      key: "sk_count",
      label: "Sk",
      field_type: "number",
      editable: false
    },
    {
      key: "followup_time",
      label: "Skambinti",
      field_type: "datetime",
      editable: false
    },
    {
      key: "reminder",
      label: "Priminimas",
      field_type: "text",
      editable: false,
      config: {
        display: "truncate",
        overflow: "popover"
      }
    },
    {
      key: "priority",
      label: "Prioritetas",
      field_type: "badge",
      editable: false,
      config: {
        color_field: "priority_color"
      }
    }
  ];

  const hotClientsColumns = [
    {
      key: "company_name",
      label: "Pavadinimas",
      field_type: "text",
      editable: false
    },
    {
      key: "phone",
      label: "Tel.",
      field_type: "text",
      editable: false
    },
    {
      key: "status_id",
      label: "Būsena",
      field_type: "select",
      editable: false,
      options_ref: "client_statuses",
      config: {
        use_option_colors: true,
        show_option_dot: true,
        color_field: "status_color"
      }
    },
    {
      key: "sent_at",
      label: "Išsiųsta",
      field_type: "datetime",
      editable: false
    },
    {
      key: "price",
      label: "Kaina",
      field_type: "money",
      editable: false
    },
    {
      key: "advance_paid",
      label: "Avansas",
      field_type: "money",
      editable: false
    }
  ];

  return {
    version: "ui.v1",
    root: {
      key: "sales_dashboard",
      type: "view",
      label: "Pardavimų apžvalga",
      children: [
        {
          key: "dashboard_filters",
          type: "filters",
          config: {
            items: [
              {
                key: "period",
                label: "Laikotarpis",
                value: "Visi"
              },
              {
                key: "period_data",
                label: "Laikotarpis",
                value: "Visi duomenys"
              }
            ]
          }
        },
        {
          key: "dashboard_kpis",
          type: "kpi_cards",
          data: {
            cards: [
              {
                key: "earned",
                label: "Uždirbta",
                value: moneyNoDecimals(kpis.earned),
                raw_value: Number(kpis.earned || 0),
                color: "#16A34A"
              },
              {
                key: "waiting_payment",
                label: "Laukiama mokėjimo",
                value: moneyNoDecimals(kpis.waiting_payment),
                raw_value: Number(kpis.waiting_payment || 0),
                color: "#14B8A6"
              },
              {
                key: "potential",
                label: "Potencialas",
                value: moneyNoDecimals(kpis.potential),
                raw_value: Number(kpis.potential || 0),
                color: "#7C3AED"
              },
              {
                key: "commission",
                label: "Komisiniai",
                value: moneyTwoDecimals(kpis.commission),
                raw_value: Number(kpis.commission || 0),
                color: "#0284C7"
              },
              {
                key: "open_clients",
                label: "Neuždaryti klientai",
                value: numberValue(kpis.open_clients),
                raw_value: Number(kpis.open_clients || 0),
                color: "#F59E0B"
              },
              {
                key: "paid_clients",
                label: "Apmokėti klientai",
                value: numberValue(kpis.paid_clients),
                raw_value: Number(kpis.paid_clients || 0),
                color: "#7C3AED"
              }
            ]
          }
        },
        {
          key: "today_calls_title",
          type: "content",
          label: "Šiandienos skambučiai",
          config: {
            variant: "section_title"
          }
        },
        {
          key: "today_calls_table",
          type: "table",
          label: "Šiandienos skambučiai",
          config: {
            primary_key: "id",
            editable: false,
            columns: todayCallsColumns
          },
          data: {
            rows: todayCallRows
          },
          actions: []
        },
        {
          key: "hot_clients_title",
          type: "content",
          label: "Karšti klientai",
          config: {
            variant: "section_title"
          }
        },
        {
          key: "hot_clients_table",
          type: "table",
          label: "Karšti klientai",
          config: {
            primary_key: "id",
            editable: false,
            columns: hotClientsColumns
          },
          data: {
            rows: hotClientRows
          },
          actions: []
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