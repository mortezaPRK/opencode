import { expect, test } from "bun:test"
import path from "node:path"
import { render } from "solid-js/web"
import type { Context, HeaderItem } from "@opencode/plugin/gui"
import { buildGuiBundle } from "../../server/src/gui-bundle"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("renders the session badge example in the session header", async () => {
  const build = await buildGuiBundle(path.resolve(import.meta.dir, "../../plugins/session-badge/gui.tsx"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())
  const items: HeaderItem[] = []

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
    ui: {
      command: () => () => undefined,
      dialog: () => ({ close() {} }),
      sidebar: () => () => undefined,
      header(item) {
        items.push(item)

        return () => undefined
      },
    },
  } satisfies Context)

  expect(items.map((item) => item.id)).toEqual(["project"])

  const container = document.createElement("div")

  const dispose = render(
    () =>
      items[0]!.render({
        session: { id: "ses_123456", serverID: "sidecar", directory: "/work/alpha", project: "alpha" },
        active: true,
      }),
    container,
  )

  expect(container.textContent).toContain("alpha")
  expect(container.querySelector('[title*="On screen"]')).not.toBeNull()
  dispose()
})
