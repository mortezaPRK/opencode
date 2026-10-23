import { define } from "@opencode/plugin/gui"

const en = {
  "badge.project": "Project",
  "badge.active": "On screen",
  "badge.cached": "Cached timeline",
}

export default define({
  id: "session-badge",
  i18n: { en },
  setup(context) {
    context.ui.header({
      id: "project",
      order: 15,
      render: (input) => (
        <span
          title={`${input.session.directory} · ${input.active ? context.t("badge.active") : context.t("badge.cached")}`}
          style={{
            display: "inline-flex",
            "align-items": "center",
            gap: "6px",
            padding: "2px 8px",
            "border-radius": "999px",
            border: "1px solid var(--v2-border-border-base)",
            "font-size": "12px",
            color: "var(--v2-text-text-muted)",
            opacity: input.active ? "1" : "0.6",
            "white-space": "nowrap",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              "border-radius": "999px",
              background: input.active ? "var(--v2-state-border-success)" : "var(--v2-border-border-strong)",
            }}
          />
          {input.session.project ?? input.session.directory.split("/").at(-1) ?? context.t("badge.project")}
        </span>
      ),
    })
  },
})
