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

  const jobRoleOptions = ensureArray(input.job_role_options)
    .map(normalizeOption)
    .filter(option => option.value && option.label);

  const teamMembers = ensureArray(input.team_members);

  const jobRoleLabelById = new Map(
    jobRoleOptions.map(option => [
      String(option.value),
      String(option.label || "")
    ])
  );

  const jobRoleColorById = new Map(
    jobRoleOptions.map(option => [
      String(option.value),
      normalizeColor(option.color)
    ])
  );

  const rows = teamMembers.map(row => {
    const jobRoleId = String(row.job_role_id || "");

    return {
      id: row.id || "",

      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",

      job_role_id: jobRoleId,
      job_role_name: row.job_role_name || jobRoleLabelById.get(jobRoleId) || "",
      job_role_color: normalizeColor(
        row.job_role_color || jobRoleColorById.get(jobRoleId)
      ),

      department_name: row.department_name || "",

      created_at: row.created_at || "",
      updated_at: row.updated_at || ""
    };
  });

  const defaultJobRole = jobRoleOptions[0] || null;
  const defaultJobRoleId = defaultJobRole?.value || "";

  const columns = [
    {
      key: "name",
      label: "Vardas",
      field_type: "text",
      editable: true
    },
    {
      key: "email",
      label: "El. paštas",
      field_type: "email",
      editable: true
    },
    {
      key: "phone",
      label: "Telefonas",
      field_type: "text",
      editable: true
    },
    {
      key: "job_role_id",
      label: "Rolė",
      field_type: "select",
      editable: true,
      options_ref: "job_roles",
      config: {
        use_option_colors: true,
        show_option_dot: true,
        color_field: "job_role_color"
      }
    },
    {
      key: "department_name",
      label: "Departamentas",
      field_type: "text",
      editable: false
    },
    {
      key: "created_at",
      label: "Sukurta",
      field_type: "datetime",
      editable: false
    },
    {
      key: "updated_at",
      label: "Atnaujinta",
      field_type: "datetime",
      editable: false
    }
  ];

  function addTeamMemberAction() {
    return {
      key: "add_team_member",
      label: "Pridėti narį",
      type: "button",
      placement: "table_header",
      align: "right",
      execution: "local",
      effect: {
        type: "add_row",
        operation: "create",
        defaults: {
          name: "",
          email: "",
          phone: "",
          job_role_id: defaultJobRoleId,
          department_name: "",
          created_at: "",
          updated_at: ""
        }
      }
    };
  }

  function deleteTeamMemberAction() {
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
      key: "admin",
      type: "view",
      label: "",
      children: [
        {
          key: "team_members_section",
          type: "collapsible",
          label: "Komanda",
          config: {
            default_open: true,
            color: "#64748B",
            summary: [
              {
                label: "Nariai",
                value: rows.length
              }
            ]
          },
          children: [
            {
              key: "team_members_table",
              type: "table",
              config: {
                primary_key: "id",
                editable: true,
                autosave: {
                  enabled: true,
                  trigger: "before_request",
                  method: "PATCH",
                  api_url: "/actions/admin/save",
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
                addTeamMemberAction(),
                deleteTeamMemberAction()
              ]
            }
          ]
        }
      ]
    },
    resources: {
      job_roles: {
        type: "options",
        data: jobRoleOptions
      }
    }
  };
}

module.exports = transformView;