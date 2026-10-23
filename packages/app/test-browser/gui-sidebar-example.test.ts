import { expect, test } from "bun:test"
import path from "node:path"
import { render } from "solid-js/web"
import type { Context, SidebarSection } from "@opencode/plugin/gui"
import { buildGuiBundle } from "../../server/src/gui-bundle"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("renders the project sidebar example as a Home sidebar section", async () => {
  const build = await buildGuiBundle(path.resolve(import.meta.dir, "../../plugins/project-sidebar/gui.tsx"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())
  const sections: SidebarSection[] = []

  expect(plugin.id).toBe("project-sidebar")
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
      sidebar(section) {
        sections.push(section)

        return () => undefined
      },
    },
  } satisfies Context)

  expect(sections.map((section) => section.id)).toEqual(["sessions"])

  const container = document.createElement("div")

  const dispose = render(() => sections[0]!.render({ server: undefined, directory: undefined }), container)

  expect(container.querySelector("h2")?.textContent).toBe("Sessions")
  dispose()
})
