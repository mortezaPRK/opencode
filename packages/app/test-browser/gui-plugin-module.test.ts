import { expect, test } from "bun:test"
import path from "node:path"
import { createRoot, onCleanup } from "solid-js"
import { render } from "solid-js/web"
import { buildGuiBundle } from "../../server/src/gui-bundle"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("loads the project-sessions package using the server's GUI bundle settings", async () => {
  const build = await buildGuiBundle(path.resolve(import.meta.dir, "../../plugins/project-sessions/gui.tsx"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())

  expect(plugin.id).toBe("project-sessions")
  expect(plugin.i18n?.en["command.title"]).toBe("Sessions by project")
  expect(plugin.setup).toBeFunction()

  const container = document.createElement("div")
  document.body.appendChild(container)

  const dispose = createRoot((dispose) => {
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
        command(command) {
          command.run()

          return () => undefined
        },
        dialog(component) {
          const dialog = { close() {} }
          const unmount = render(() => component(dialog), container)
          onCleanup(unmount)

          return dialog
        },
      },
    })

    return dispose
  })

  expect(container.querySelector("h2")?.textContent).toBe("Sessions by project")
  dispose()
  container.remove()
})

test("rejects a GUI plugin bundle that imports an unshared runtime module", async () => {
  await expect(
    decodeGuiPlugin(`
      require("node:fs")
      module.exports = { default: { id: "fixture", setup() {} } }
    `),
  ).rejects.toThrow("Unsupported GUI plugin import: node:fs")
})
