import { define, type Context, type StringStore } from "@opencode/plugin/gui"
import { For, Show, createResource, onCleanup } from "solid-js"
import type { Project, SessionInfo } from "@opencode/client/promise"

const en = {
  "command.title": "Sessions by project",
  "command.description": "Browse recent sessions grouped by project",
  "dialog.title": "Sessions by project",
  "dialog.loading": "Loading project sessions…",
  "dialog.empty": "No sessions found",
  "dialog.error": "Could not load project sessions",
  "session.untitled": "Untitled session",
}

type Group = {
  serverID: string
  serverName: string
  project: Project
  sessions: SessionInfo[]
}

export default define({
  id: "project-sessions",
  i18n: { en },
  setup(context) {
    const expanded = context.storage.globalString("expanded-projects", "*")

    context.ui.command({
      id: "open",
      get title() {
        return context.t("command.title")
      },
      get description() {
        return context.t("command.description")
      },
      run: () => {
        context.ui.dialog((dialog) => <SessionBrowser context={context} expanded={expanded} close={dialog.close} />)
      },
    })
  },
})

function SessionBrowser(props: { context: Context; expanded: StringStore; close: () => void }) {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  const [groups] = createResource(() => loadGroups(props.context, controller.signal))
  const expandedKeys = () => props.expanded.value()?.split("\0").filter(Boolean) ?? []
  const groupKey = (group: Group) => `${group.serverID}\0${group.project.id}`
  const open = (group: Group) =>
    !props.expanded.ready() || props.expanded.value() === "*" || expandedKeys().includes(groupKey(group))

  const toggle = (group: Group) => {
    if (!props.expanded.ready()) return
    const current = props.expanded.value() ?? "*"
    const keys = current === "*" ? (groups()?.map(groupKey) ?? []) : expandedKeys()
    const key = groupKey(group)
    props.expanded.set(keys.includes(key) ? keys.filter((item) => item !== key).join("\0") : [...keys, key].join("\0"))
  }

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "12px",
        "max-height": "70vh",
        overflow: "auto",
        padding: "16px",
        "min-width": "min(620px, 80vw)",
      }}
    >
      <h2 style={{ margin: "0", "font-size": "16px" }}>{props.context.t("dialog.title")}</h2>
      <Show when={!groups.loading} fallback={<p>{props.context.t("dialog.loading")}</p>}>
        <Show when={!groups.error} fallback={<p role="alert">{props.context.t("dialog.error")}</p>}>
          <Show when={(groups()?.length ?? 0) > 0} fallback={<p>{props.context.t("dialog.empty")}</p>}>
            <For each={groups()}>
              {(group) => (
                <details open={open(group)} style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
                  <summary
                    onClick={(event) => {
                      event.preventDefault()
                      toggle(group)
                    }}
                    style={{ cursor: "pointer", margin: "8px 0 2px", "font-size": "13px" }}
                  >
                    {group.project.name ?? group.project.canonical}
                    <span style={{ "font-weight": "normal", opacity: "0.65" }}> · {group.serverName}</span>
                  </summary>
                  <div style={{ display: "flex", "flex-direction": "column", gap: "4px", "padding-left": "12px" }}>
                    <For each={group.sessions}>
                      {(session) => (
                        <button
                          type="button"
                          onClick={() => {
                            props.context.sessions.open(group.serverID, session.id)
                            props.close()
                          }}
                          style={{
                            display: "flex",
                            "justify-content": "space-between",
                            gap: "16px",
                            width: "100%",
                            padding: "8px",
                            "text-align": "left",
                            background: "transparent",
                            border: "1px solid var(--v2-border-border-base)",
                            "border-radius": "6px",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          <span>{session.title || props.context.t("session.untitled")}</span>
                          <time style={{ opacity: "0.65", "white-space": "nowrap" }}>
                            {new Date(session.time.updated).toLocaleString()}
                          </time>
                        </button>
                      )}
                    </For>
                  </div>
                </details>
              )}
            </For>
          </Show>
        </Show>
      </Show>
    </div>
  )
}

async function loadGroups(context: Context, signal: AbortSignal): Promise<Group[]> {
  const servers = context.servers.list().filter((server) => server.connected && server.compatible)
  const groups = await Promise.all(
    servers.map(async (server) => {
      const projects = await server.client.project.list({}, { signal })

      return Promise.all(
        projects.map(async (project) => {
          const page = await server.client.session.list(
            {
              project: project.id,
              parentID: null,
              limit: 50,
              order: "desc",
            },
            { signal },
          )

          return { serverID: server.id, serverName: server.name, project, sessions: page.data }
        }),
      )
    }),
  )

  return groups.flat().filter((group) => group.sessions.length > 0)
}
