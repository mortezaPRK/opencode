import type { Schema } from "effect"

/** String storage owned by one GUI plugin in the Desktop main process. */
export interface MainStorage {
  /** Reads a value, or undefined when unset. */
  get(key: string): string | undefined
  /** Writes a value. */
  set(key: string, value: string): void
  /** Removes a key. */
  delete(key: string): void
}

/** The APIs available to one GUI plugin's main-process entry. */
export interface MainContext {
  /** The plugin id. */
  readonly id: string
  /** Options from the matching entry in the `plugins` configuration. */
  readonly options: Readonly<Record<string, Schema.Json>>
  /** Persistent string storage in this plugin's namespace. */
  readonly storage: MainStorage
  /** Writes to the Desktop log. */
  log(level: "debug" | "info" | "warn" | "error", message: string, data?: Readonly<Record<string, Schema.Json>>): void
}

/**
 * A main-process entry exported from the package's `./gui/main` subpath.
 *
 * It runs in the Desktop main process, with full Node access, only when the user opts in with
 * `OPENCODE_DESKTOP_PLUGIN_MAIN=1`. Keep it free of window code.
 */
export interface MainDefinition {
  /** A stable, unique plugin id; it must match the GUI entry's id. */
  readonly id: string
  /**
   * Runs once per Desktop launch, after the built-in local server is ready. Return a cleanup to undo
   * anything it started; Desktop runs it on quit.
   */
  main(context: MainContext): void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>
}

/** Creates a typed main-process plugin definition. */
export function defineMain<const T extends MainDefinition>(definition: T): T {
  return definition
}
