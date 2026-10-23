import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { buildGuiMain } from "../src/gui-bundle"

test("bundles a GUI plugin main entry for Node", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "opencode-gui-main-"))

  try {
    const entry = path.join(directory, "main.ts")
    await writeFile(
      entry,
      `import { defineMain } from "@opencode/plugin/gui/main"
      export default defineMain({
        id: "fixture",
        main(ctx) {
          ctx.storage.set("ran", "yes")
          return () => ctx.storage.delete("ran")
        },
      })`,
    )

    const built = await buildGuiMain(entry)

    expect(built.success).toBe(true)
    const output = built.outputs[0]

    expect(output).toBeDefined()

    if (!output) return

    const module: { exports: { default?: { id: string; main: (input: unknown) => unknown } } } = { exports: {} }

    new Function("require", "module", "exports", await output.text())(
      (name: string) => {
        if (name === "@opencode/plugin/gui/main") return { defineMain: (value: unknown) => value }

        throw new Error(`Unexpected import: ${name}`)
      },
      module,
      module.exports,
    )

    expect(module.exports.default?.id).toBe("fixture")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
