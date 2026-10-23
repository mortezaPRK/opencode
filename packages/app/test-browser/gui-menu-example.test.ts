import { expect, test } from "bun:test"
import path from "node:path"
import { render } from "solid-js/web"
import type { JSX } from "solid-js"
import type { Context, MenuAction } from "@opencode/plugin/gui"
import { buildGuiBundle } from "../../server/src/gui-bundle"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("renders the session menu example and its dialog", async () => {
  const build = await buildGuiBundle(path.resolve(import.meta.dir, "../../plugins/session-menu/gui.tsx"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())
  const actions: MenuAction[] = []
  let dialog: JSX.Element | undefined

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
    panels: { open() {}, close() {} },
    ui: {
      command: () => () => undefined,
      dialog(component) {
        dialog = component({ close() {} })

        return { close() {} }
      },
      sidebar: () => () => undefined,
      header: () => () => undefined,
      panel: () => () => undefined,
      menu(action) {
        actions.push(action)

        return () => undefined
      },
    },
  } satisfies Context)

  expect(actions.map((action) => action.id)).toEqual(["inspect"])

  actions[0]!.run({
    session: { id: "ses_123456", serverID: "sidecar", directory: "/work/alpha", project: "alpha" },
  })

  const container = document.createElement("div")

  const dispose = render(() => dialog!, container)

  expect(container.textContent).toContain("alpha")
  expect(container.textContent).toContain("ses_123456")
  dispose()
})
