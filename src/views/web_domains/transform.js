function transformView(input) {
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


  // =========================================================
  // DATA
  // =========================================================

  const domains = ensureArray(input.domains);

  const today = new Date()
    .toISOString()
    .slice(0, 10);


  // =========================================================
  // ROWS
  // =========================================================

  const rows = domains.map(row => ({
    id: row.id,

    url:
      row.url || "",

    price:
      row.price ?? "",

    domain_date:
      row.domain_date || "",

    created_at:
      row.created_at || "",

    updated_at:
      row.updated_at || ""
  }));


  // =========================================================
  // COLUMNS
  // =========================================================

  const columns = [
    {
      key: "url",
      label: "Domenas",
      field_type: "text",
      editable: true
    },
    {
      key: "price",
      label: "Kaina €",
      field_type: "number",
      editable: true
    },
    {
      key: "domain_date",
      label: "Data",
      field_type: "date",
      editable: true
    }
  ];


  // =========================================================
  // ADD DOMAIN ACTION
  // =========================================================

  function addDomainAction() {
    return {
      key: "add_domain",
      label: "Pridėti domeną",
      type: "button",
      placement: "table_header",
      align: "right",

      execution: "local",

      effect: {
        type: "add_row",
        operation: "create",

        defaults: {
          url: "",
          price: "",
          domain_date: today
        }
      }
    };
  }


  // =========================================================
  // DELETE DOMAIN ACTION
  // =========================================================

  function deleteDomainAction() {
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


  // =========================================================
  // RESPONSE
  // =========================================================

  return {
    version: "ui.v1",

    root: {
      key: "web_domains",
      type: "view",
      label: "",

      children: [
        {
          key: "web_domains_table",
          type: "table",

          config: {
            primary_key: "id",
            editable: true,

            autosave: {
              enabled: true,
              trigger: "before_request",
              method: "PATCH",
              api_url: "/actions/domains/save",
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
            addDomainAction(),
            deleteDomainAction()
          ]
        }
      ]
    },

    resources: {}
  };
}

module.exports = transformView;