import { expect, test } from "bun:test"
import path from "node:path"
import { render } from "solid-js/web"
import type { Command, Context, PanelItem } from "@opencode/plugin/gui"
import { buildGuiBundle } from "../../server/src/gui-bundle"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("renders the session panel example and opens it from its command", async () => {
  const build = await buildGuiBundle(path.resolve(import.meta.dir, "../../plugins/session-panel/gui.tsx"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())
  const panels: PanelItem[] = []
  const commands: Command[] = []
  const opened: string[] = []

  plugin.setup({
    id: plugin.id,
    options: {},
    t: (key) => plugin.i18n?.en[key] ?? key,
    storage: {
      global: () => ({ value: () => null, ready: () => true, set() {} }),
      globalString: () => ({ value: () => "*", ready: () => true, set() {} }),
    },
    servers: { list: () => [], get: () => undefined },
    sessions: { open() {} },
    panels: {
      open: (id) => void opened.push(id),
      close() {},
    },
    ui: {
      command(command) {
        commands.push(command)

        return () => undefined
      },
      dialog: () => ({ close() {} }),
      sidebar: () => () => undefined,
      header: () => () => undefined,
      panel(panel) {
        panels.push(panel)

        return () => undefined
      },
    },
  } satisfies Context)

  expect(panels.map((panel) => panel.id)).toEqual(["facts"])

  commands[0]!.run()
  expect(opened).toEqual(["facts"])

  const container = document.createElement("div")

  const dispose = render(
    () =>
      panels[0]!.render({
        session: { id: "ses_123456", serverID: "sidecar", directory: "/work/alpha", project: "alpha" },
      }),
    container,
  )

  expect(container.textContent).toContain("alpha")
  expect(container.textContent).toContain("/work/alpha")
  expect(container.textContent).toContain("ses_123456")
  dispose()
})
