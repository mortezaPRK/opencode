import { define } from "@opencode/plugin/gui"

const en = {
  "menu.inspect": "Inspect session",
  "dialog.title": "Session",
  "dialog.project": "Project",
  "dialog.directory": "Directory",
  "dialog.server": "Server",
  "dialog.id": "Session id",
  "dialog.none": "No routed session",
  "dialog.close": "Close",
}

export default define({
  id: "session-menu",
  i18n: { en },
  setup(context) {
    context.ui.menu({
      id: "inspect",
      get title() {
        return context.t("menu.inspect")
      },
      run: ({ session }) =>
        context.ui.dialog((dialog) => (
          <div
            data-component="session-menu-inspect"
            style={{ display: "flex", "flex-direction": "column", gap: "12px", padding: "16px", "min-width": "280px" }}
          >
            <h2 style={{ margin: "0", "font-size": "16px" }}>{context.t("dialog.title")}</h2>
            {session ? (
              <dl style={{ display: "grid", "grid-template-columns": "auto 1fr", gap: "6px 12px", margin: "0" }}>
                <dt>{context.t("dialog.project")}</dt>
                <dd style={{ margin: "0" }}>{session.project ?? "—"}</dd>
                <dt>{context.t("dialog.directory")}</dt>
                <dd style={{ margin: "0", "overflow-wrap": "anywhere" }}>{session.directory}</dd>
                <dt>{context.t("dialog.server")}</dt>
                <dd style={{ margin: "0" }}>{session.serverID}</dd>
                <dt>{context.t("dialog.id")}</dt>
                <dd style={{ margin: "0" }}>{session.id}</dd>
              </dl>
            ) : (
              <p style={{ margin: "0" }}>{context.t("dialog.none")}</p>
            )}
            <button type="button" onClick={dialog.close}>
              {context.t("dialog.close")}
            </button>
          </div>
        )),
    })
  },
})
