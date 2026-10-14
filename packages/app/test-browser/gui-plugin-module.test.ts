import { expect, test } from "bun:test"
import path from "node:path"
import { decodeGuiPlugin } from "../src/runtime/extension/gui-plugin-module"

test("loads the project-sessions package using the server's GUI bundle settings", async () => {
  const build = await Bun.build({
    entrypoints: [path.resolve(import.meta.dir, "../../plugins/project-sessions/gui.tsx")],
    target: "browser",
    format: "cjs",
    jsx: { runtime: "automatic", importSource: "solid-js" },
    external: [
      "@opencode/plugin/gui",
      "solid-js",
      "solid-js/store",
      "solid-js/jsx-runtime",
      "solid-js/jsx-dev-runtime",
      "solid-js/web",
    ],
  })

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  const plugin = await decodeGuiPlugin(await output.text())

  expect(plugin.id).toBe("project-sessions")
  expect(plugin.i18n?.en["command.title"]).toBe("Sessions by project")
  expect(plugin.setup).toBeFunction()
})

test("rejects a GUI plugin bundle that imports an unshared runtime module", async () => {
  await expect(
    decodeGuiPlugin(`
      require("node:fs")
      module.exports = { default: { id: "fixture", setup() {} } }
    `),
  ).rejects.toThrow("Unsupported GUI plugin import: node:fs")
})
