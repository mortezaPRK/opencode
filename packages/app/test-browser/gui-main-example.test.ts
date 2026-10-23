import { expect, test } from "bun:test"
import path from "node:path"
import type { MainContext, MainDefinition } from "@opencode/plugin/gui/main"
import { buildGuiMain } from "../../server/src/gui-bundle"

test("builds and runs the launch-log example main entry", async () => {
  const build = await buildGuiMain(path.resolve(import.meta.dir, "../../plugins/launch-log/gui/main.ts"))

  expect(build.success).toBe(true)
  const output = build.outputs[0]

  expect(output).toBeDefined()

  if (!output) return

  type Loaded = { default?: { id: string; main: (input: MainContext) => void } }

  type Module = { exports: Loaded }

  const module: Module = { exports: {} }

  new Function("require", "module", "exports", await output.text())(
    (name: string) => {
      if (name === "@opencode/plugin/gui/main") return { defineMain: (value: MainDefinition) => value }

      throw new Error(`Unexpected import: ${name}`)
    },
    module,
    module.exports,
  )

  const values = new Map<string, string>()
  const logs: string[] = []
  const definition = module.exports.default

  expect(definition?.id).toBe("launch-log")

  definition!.main({
    id: "launch-log",
    options: {},
    storage: {
      get: (key) => values.get(key),
      set: (key, value) => void values.set(key, value),
      delete: (key) => void values.delete(key),
    },
    log: (level, message) => void logs.push(`${level}:${message}`),
  })

  expect(values.get("last")).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  expect(logs).toEqual(["info:desktop launch recorded"])
})
