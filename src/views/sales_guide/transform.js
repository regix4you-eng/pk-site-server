function transformView(input) {
  input = input || {};

  return {
    version: "ui.v1",
    root: {
      key: "sales_guide",
      type: "view",
      label: "",
      children: [
        {
          key: "sales_guide_editor",
          type: "content",
          label: input.title || "Pardavimų gidas",
          config: {
            variant: "editor",
            field_type: "textarea",
            editable: true,
            field_key: "content",
            rows: 24
          },
          data: {
            id: input.id,
            key: input.key || "sales_guide",
            title: input.title || "Pardavimų gidas",
            subtitle: input.subtitle || "Bendras pardavėjų lapas.",
            content: input.content || "",
            updated_at: input.updated_at || null,
            updated_by_name: input.updated_by_name || ""
          },
          actions: [
            {
              key: "save_content",
              label: "Išsaugoti",
              type: "button",
              placement: "content_footer",
              method: "PATCH",
              api_url: "/actions/sales-guides/save",
              target: {
                type: "node",
                key: "sales_guide_editor"
              },
              payload: {
                source: "node_data"
              },
              after_success: {
                type: "refresh_view"
              }
            }
          ]
        }
      ]
    },
    resources: {}
  };
}

module.exports = transformView;