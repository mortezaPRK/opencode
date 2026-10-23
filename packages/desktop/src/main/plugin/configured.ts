import { createRequire } from "node:module"
import { Option, Predicate, Schema } from "effect"
import type { MainContext, MainDefinition } from "@opencode/plugin/gui/main"

const Inventory = Schema.Struct({
  data: Schema.Array(Schema.Struct({ id: Schema.optionalKey(Schema.String) })),
})

const Bundle = Schema.Struct({
  data: Schema.Struct({
    source: Schema.String,
    options: Schema.Record(Schema.String, Schema.Json),
  }),
})

const Loaded = Schema.Struct({
  id: Schema.String,
  main: Schema.declare<MainDefinition["main"]>((value): value is MainDefinition["main"] => Predicate.isFunction(value)),
})

type LogData = Readonly<Record<string, Schema.Json>>

/** One configured plugin's main entry as Desktop started it. */
export interface Started {
  readonly count: number
  stop(): Promise<void>
}

const EMPTY: Started = { count: 0, stop: async () => undefined }

/**
 * Runs the main entries of the GUI plugins listed in global config.
 *
 * Configured plugin code has full Node access here, so this is opt-in: it does nothing unless
 * `OPENCODE_DESKTOP_PLUGIN_MAIN=1`. It talks only to Desktop's built-in server, the same server that
 * already runs each plugin's server entry.
 */
export async function startConfiguredMain(input: {
  readonly url: string
  readonly password: string
  readonly storage: (id: string) => MainContext["storage"]
  readonly log: (level: "debug" | "info" | "warn" | "error", message: string, data?: LogData) => void
}): Promise<Started> {
  if (process.env.OPENCODE_DESKTOP_PLUGIN_MAIN !== "1") return EMPTY

  const authorization = `Basic ${Buffer.from(`opencode:${input.password}`).toString("base64")}`
  const headers = { authorization, "content-type": "application/json" }
  const cleanups: (() => void | Promise<void>)[] = []

  const inventory = await waitForInventory(input.url, headers)

  if (Option.isNone(inventory)) return EMPTY

  for (const plugin of inventory.value.data) {
    if (!plugin.id) continue

    const body = await bundle(input, headers, plugin.id)

    if (!body) continue

    try {
      const definition = evaluate(body.source)

      if (!definition) throw new Error("main entry must default-export defineMain({ id, main })")

      const cleanup = await definition.main({
        id: definition.id,
        options: body.options,
        storage: input.storage(definition.id),
        log: (level, message, data) => input.log(level, `[${definition.id}] ${message}`, data),
      })

      if (Predicate.isFunction(cleanup)) cleanups.push(cleanup)
    } catch (error) {
      input.log("error", `failed to start main entry for ${plugin.id}`, { error: String(error) })
    }
  }

  return {
    count: cleanups.length,
    async stop() {
      for (const cleanup of cleanups.reverse()) await cleanup()

      cleanups.length = 0
    },
  }
}

/** The server activates plugins per location on first use; wait for the inventory instead of racing it. */
async function waitForInventory(url: string, headers: Record<string, string>) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const inventory: unknown = await fetch(`${url}/api/plugin`, { headers })
      .then((response) => response.json())
      .catch(() => undefined)

    const decoded = Schema.decodeUnknownOption(Inventory)(inventory)

    if (Option.isSome(decoded) && decoded.value.data.length > 0) return decoded

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return Option.none()
}

async function bundle(
  input: { readonly url: string; log: (level: "debug" | "info" | "warn" | "error", message: string, data?: LogData) => void },
  headers: Record<string, string>,
  id: string,
) {
  try {
    const response = await fetch(`${input.url}/api/plugin/main`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      input.log("warn", `main entry is unavailable for ${id}`, { status: response.status })

      return
    }

    const decoded = Schema.decodeUnknownOption(Bundle)(await response.json())

    if (Option.isNone(decoded)) {
      input.log("warn", `invalid main bundle response for ${id}`)

      return
    }

    return decoded.value.data
  } catch (error) {
    input.log("warn", `failed to request main entry for ${id}`, { error: String(error) })
  }
}

function evaluate(source: string): MainDefinition | undefined {
  const require = createRequire(import.meta.url)

  type Exports = { default?: unknown }

  type Module = { exports: Exports }

  const module: Module = { exports: {} }

  // Configured plugins are trusted code the user authorized in global config and opted into running.
  new Function("require", "module", "exports", source)(
    (name: string) => {
      if (name === "electron") return require("electron")

      if (name === "@opencode/plugin/gui/main") return { defineMain: (definition: MainDefinition) => definition }

      throw new Error(`Unsupported plugin main import: ${name}`)
    },
    module,
    module.exports,
  )

  const decoded = Schema.decodeUnknownOption(Loaded)(module.exports.default)

  return Option.isNone(decoded) ? undefined : { id: decoded.value.id, main: decoded.value.main }
}
