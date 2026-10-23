import type { OpenCodeClient } from "@opencode/client/promise"
import type { Schema } from "effect"
import type { JSX } from "solid-js"

/** A Desktop server available to a GUI plugin. */
export interface Server {
  /** The app's server key. */
  readonly id: string
  /** The name shown by the app. */
  readonly name: string
  /** Whether the server is local to this machine. */
  readonly local: boolean
  /** Whether this is OpenCode Desktop's built-in server. */
  readonly builtin: boolean
  /** Whether the server is currently reachable. */
  readonly connected: boolean
  /** Whether the app supports this server's API version. */
  readonly compatible: boolean
  /** The authenticated client for this server; read it from the server each time it is used. */
  readonly client: OpenCodeClient
}

/** A command a GUI plugin contributes to Desktop's command palette. */
export interface Command {
  /** The plugin-local command id. */
  readonly id: string
  /** The command's palette title. */
  readonly title: string
  /** The command's optional secondary line. */
  readonly description?: string
  /** The default key binding. */
  readonly bind?: string
  /** Runs when the user selects the command. */
  run(): void | Promise<void>
}

/** A dialog handle that lets its renderer close the dialog. */
export interface Dialog {
  /** Closes this dialog. */
  close(): void
}

/** A persisted JSON value whose data is scoped to one GUI plugin. */
export interface JsonStore {
  /** The value, or undefined until the app has loaded it. Reactive.
   * @example `store.value()`
   */
  value(): Schema.Json | undefined
  /** Whether the stored value has loaded. Reactive.
   * @example `store.ready()`
   */
  ready(): boolean
  /** Replaces the stored JSON value. The host preserves write order while loading.
   * @example `store.set({ expanded: true })`
   */
  set(value: Schema.Json): void
}

/** A persisted string with a caller-supplied default. */
export interface StringStore {
  /** The stored string, or undefined until the app has loaded it. Reactive.
   * @example `store.value()`
   */
  value(): string | undefined
  /** Whether the stored value has loaded. Reactive.
   * @example `store.ready()`
   */
  ready(): boolean
  /** Replaces the stored string. The host preserves write order while loading.
   * @example `store.set("project-a")`
   */
  set(value: string): void
}

/** Persistent GUI plugin storage. */
export interface Storage {
  /** Opens a global JSON value in this plugin's storage namespace.
   * @example `ctx.storage.global("recent-projects")`
   */
  global(key: string): JsonStore
  /** Opens a global string with an optional initial value; defaults to the empty string. Use distinct keys for each store type.
   * @example `ctx.storage.globalString("expanded-projects", "*")`
   */
  globalString(key: string, initial?: string): StringStore
}

/** Translated GUI plugin messages, with English as the fallback catalog. */
export type Catalog = {
  /** English source strings and fallback values. */
  readonly en: Readonly<Record<string, string>>
} & {
  /** Another locale's complete or partial strings. */
  readonly [locale: string]: Readonly<Record<string, string>>
}

/** The routed session a header item renders for. */
export interface SessionSummary {
  /** The session id on its server. */
  readonly id: string
  /** The app's server key. */
  readonly serverID: string
  /** The session's workspace directory. */
  readonly directory: string
  /** The listed project's name, when the session belongs to one. */
  readonly project: string | undefined
}

/** What a session header item receives. */
export interface HeaderInput {
  /** The routed session. Reactive. */
  readonly session: SessionSummary
  /** This timeline is the one on screen. Reactive. */
  readonly active: boolean
}

/** An item contributed to the session header, beside the built-in context and details indicators. */
export interface HeaderItem {
  /** The item id, unique within the plugin. */
  readonly id: string
  /** Items render in ascending order. Defaults to 0. */
  readonly order?: number
  /**
   * Renders the item once; its own reactivity updates it. Read `input.session` and `input.active` where you use them:
   * they change without a remount.
   *
   * @param input - The routed session and whether its timeline is on screen.
   */
  render(input: HeaderInput): JSX.Element
}

/** A Home sidebar section contributed by a GUI plugin. */
export interface SidebarSection {
  /** The section id, unique within the plugin. */
  readonly id: string
  /** Sections render in ascending order. Defaults to 0. */
  readonly order?: number
  /**
   * Renders the section once; its own reactivity updates it. Read `input.server` and `input.directory` where you use
   * them: they change without a remount.
   *
   * @param input - Home's focused server and selected project directory.
   */
  render(input: SidebarSectionInput): JSX.Element
}

/** What a Home sidebar section receives. */
export interface SidebarSectionInput {
  /** The server Home is focused on, or undefined while it lists every server. Reactive. */
  readonly server: string | undefined
  /** The selected project directory, or undefined when Home selects no project. Reactive. */
  readonly directory: string | undefined
}

/** The APIs available to one GUI plugin instance. */
export interface Context {
  /** The plugin id.
   * @example `ctx.id`
   */
  readonly id: string
  /** Options from the matching entry in the existing `plugins` configuration; defaults to an empty object.
   * @example `ctx.options.groupLimit`
   */
  readonly options: Readonly<Record<string, Schema.Json>>
  /** Resolves a plugin-owned translation key, falling back to English or the key itself.
   * @example `ctx.t("command.title")`
   */
  t(key: string): string
  /** Persistent state owned by this plugin. Keys share one namespace across storage methods.
   * @example `ctx.storage.globalString("expanded-projects", "*")`
   */
  readonly storage: Storage
  /** The servers Desktop currently lists.
   * @example `ctx.servers.list()`
   */
  readonly servers: {
    /** Lists the current servers. */
    list(): readonly Server[]
    /** Looks up a listed server; returns undefined when it is not listed.
     * @example `ctx.servers.get(serverID)`
     */
    get(serverID: string): Server | undefined
  }
  /** Session navigation provided by the app shell.
   * @example `ctx.sessions.open(server.id, session.id)`
   */
  readonly sessions: {
    /** Opens a session, creating or focusing its tab. */
    open(serverID: string, sessionID: string): void
  }
  /** UI contributions.
   * @example `ctx.ui.command({ id: "open", title: "Open", run() {} })`
   */
  readonly ui: {
    /** Adds a command and returns a cleanup function that unregisters it.
     * @example `ctx.ui.command({ id: "open", title: "Open", run() {} })`
     */
    command(command: Command): () => void
    /** Opens a dialog rendered by this plugin.
     * @example `ctx.ui.dialog(({ close }) => <button onClick={close}>Close</button>)`
     */
    dialog(render: (dialog: Dialog) => JSX.Element): Dialog
    /** Adds a section to the Home project sidebar and returns a cleanup function that unregisters it. Desktop only.
     * @example `ctx.ui.sidebar({ id: "sessions", render: () => <p>Sessions</p> })`
     */
    sidebar(section: SidebarSection): () => void
    /** Adds an item to the session header and returns a cleanup function that unregisters it.
     * @example `ctx.ui.header({ id: "status", render: ({ active }) => <span>{active ? "On screen" : ""}</span> })`
     */
    header(item: HeaderItem): () => void
  }
}

/** A plugin entry point exported from the package's `./gui` subpath. */
export interface Definition {
  /** A stable, unique plugin id. */
  readonly id: string
  /** Translation catalogs owned by this plugin. */
  readonly i18n?: Catalog
  /** Sets up the plugin synchronously and optionally returns cleanup for its registrations. */
  setup(context: Context): void | (() => void)
}

/** Creates a typed GUI plugin definition. */
export function define<const T extends Definition>(definition: T): T {
  return definition
}
