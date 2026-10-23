import { define } from "@opencode/plugin/gui"

const en = {
  "section.title": "Launch log",
  "section.body": "The main entry records each Desktop launch. Set OPENCODE_DESKTOP_PLUGIN_MAIN=1 to enable it.",
}

export default define({
  id: "launch-log",
  i18n: { en },
  setup(context) {
    context.ui.sidebar({
      id: "launch-log",
      order: 20,
      render: () => (
        <section
          data-component="launch-log"
          style={{ display: "flex", "flex-direction": "column", gap: "4px", "margin-top": "16px", "padding-right": "12px" }}
        >
          <h2 style={{ margin: "0", "padding-left": "6px", "font-size": "13px", "font-weight": "530", color: "var(--v2-text-text-muted)" }}>
            {context.t("section.title")}
          </h2>
          <p style={{ margin: "0", padding: "0 6px", "font-size": "13px", color: "var(--v2-text-text-faint)" }}>
            {context.t("section.body")}
          </p>
        </section>
      ),
    })
  },
})
