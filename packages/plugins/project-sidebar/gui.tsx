import { define, type Context } from "@opencode/plugin/gui"
import { For, Show, createResource, onCleanup } from "solid-js"
import type { Project, SessionInfo } from "@opencode/client/promise"

const en = {
  "section.title": "Sessions",
  "section.loading": "Loading sessions…",
  "section.empty": "No sessions",
  "section.failed": "Could not load sessions",
  "project.untitled": "Untitled project",
  "session.untitled": "Untitled session",
}

type Group = {
  serverID: string
  serverName: string
  project: Project
  sessions: SessionInfo[]
}

export default define({
  id: "project-sidebar",
  i18n: { en },
  setup(context) {
    const expanded = context.storage.globalString("expanded", "*")

    context.ui.sidebar({
      id: "sessions",
      order: 10,
      render: (input) => (
        <ProjectSessions context={context} expanded={expanded} server={input.server} directory={input.directory} />
      ),
    })
  },
})

function ProjectSessions(props: {
  context: Context
  expanded: ReturnType<Context["storage"]["globalString"]>
  server: string | undefined
  directory: string | undefined
}) {
  const controller = new AbortController()
  onCleanup(() => controller.abort())

  const [groups] = createResource(
    () => `${props.server ?? ""}\0${props.directory ?? ""}`,
    () => loadGroups(props.context, props.server, props.directory, controller.signal),
  )

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
    <section
      data-component="project-sidebar"
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "2px",
        "margin-top": "16px",
        "padding-right": "12px",
      }}
    >
      <h2
        style={{
          margin: "0 0 4px",
          "padding-left": "6px",
          "font-size": "13px",
          "font-weight": "530",
          color: "var(--v2-text-text-muted)",
        }}
      >
        {props.context.t("section.title")}
      </h2>
      <Show when={!groups.loading} fallback={<Message text={props.context.t("section.loading")} />}>
        <Show when={groups.error} fallback={null}>
          <Message text={props.context.t("section.failed")} />
        </Show>
        <Show when={!groups.error}>
          <Show when={(groups()?.length ?? 0) > 0} fallback={<Message text={props.context.t("section.empty")} />}>
            <For each={groups()}>
              {(group) => (
                <details open={open(group)} style={{ display: "flex", "flex-direction": "column" }}>
                  <summary
                    onClick={(event) => {
                      event.preventDefault()
                      toggle(group)
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      "font-size": "13px",
                      color: "var(--v2-text-text-muted)",
                    }}
                  >
                    {group.project.name ||
                      group.project.canonical.split("/").at(-1) ||
                      props.context.t("project.untitled")}
                  </summary>
                  <div style={{ display: "flex", "flex-direction": "column", gap: "4px", "padding-left": "6px" }}>
                    <For each={group.sessions}>
                      {(session) => (
                        <button
                          type="button"
                          onClick={() => props.context.sessions.open(group.serverID, session.id)}
                          style={{
                            display: "flex",
                            width: "100%",
                            padding: "4px 6px",
                            border: "0",
                            "border-radius": "6px",
                            background: "transparent",
                            color: "inherit",
                            cursor: "pointer",
                            "text-align": "left",
                            "font-size": "13px",
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                            "white-space": "nowrap",
                          }}
                        >
                          {session.title || props.context.t("session.untitled")}
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
    </section>
  )
}

function Message(props: { text: string }) {
  return (
    <p
      style={{
        margin: "0",
        padding: "0 6px",
        "font-size": "13px",
        color: "var(--v2-text-text-faint)",
      }}
    >
      {props.text}
    </p>
  )
}

async function loadGroups(
  context: Context,
  server: string | undefined,
  directory: string | undefined,
  signal: AbortSignal,
): Promise<Group[]> {
  const servers = context.servers
    .list()
    .filter((item) => item.connected && item.compatible && (!server || item.id === server))
  const groups = await Promise.all(
    servers.map(async (item) => {
      const projects = await item.client.project.list({}, { signal })
      const selected = directory ? projects.filter((project) => project.canonical === directory) : projects

      return Promise.all(
        selected.map(async (project) => {
          const page = await item.client.session.list(
            { project: project.id, parentID: null, limit: 20, order: "desc" },
            { signal },
          )

          return { serverID: item.id, serverName: item.name, project, sessions: page.data }
        }),
      )
    }),
  )

  return groups.flat().filter((group) => group.sessions.length > 0)
}
