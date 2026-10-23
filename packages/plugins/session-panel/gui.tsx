import { define } from "@opencode/plugin/gui"

const en = {
  "command.open": "Session facts",
  "panel.title": "Facts",
  "panel.project": "Project",
  "panel.directory": "Directory",
  "panel.session": "Session",
  "panel.server": "Server",
  "panel.empty": "No routed session",
}

export default define({
  id: "session-panel",
  i18n: { en },
  setup(context) {
    context.ui.panel({
      id: "facts",
      get title() {
        return context.t("panel.title")
      },
      render: (input) => (
        <dl
          data-component="session-facts"
          style={{
            display: "grid",
            "grid-template-columns": "auto 1fr",
            gap: "6px 12px",
            margin: "0",
            padding: "12px",
            "font-size": "13px",
          }}
        >
          <dt style={{ color: "var(--v2-text-text-muted)" }}>{context.t("panel.project")}</dt>
          <dd style={{ margin: "0" }}>{input.session.project ?? "—"}</dd>
          <dt style={{ color: "var(--v2-text-text-muted)" }}>{context.t("panel.directory")}</dt>
          <dd style={{ margin: "0", "overflow-wrap": "anywhere" }}>{input.session.directory}</dd>
          <dt style={{ color: "var(--v2-text-text-muted)" }}>{context.t("panel.server")}</dt>
          <dd style={{ margin: "0" }}>{input.session.serverID}</dd>
          <dt style={{ color: "var(--v2-text-text-muted)" }}>{context.t("panel.session")}</dt>
          <dd style={{ margin: "0" }}>{input.session.id}</dd>
        </dl>
      ),
    })

    context.ui.command({
      id: "open",
      get title() {
        return context.t("command.open")
      },
      run: () => context.panels.open("facts"),
    })
  },
})
