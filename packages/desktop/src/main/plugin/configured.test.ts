import { afterEach, expect, test } from "bun:test"
import { startConfiguredMain } from "./configured"

const previous = process.env.OPENCODE_DESKTOP_PLUGIN_MAIN

afterEach(() => {
  if (previous === undefined) delete process.env.OPENCODE_DESKTOP_PLUGIN_MAIN
  else process.env.OPENCODE_DESKTOP_PLUGIN_MAIN = previous
})

test("runs a configured plugin main entry and its cleanup", async () => {
  const values = new Map<string, string>()
  const requests: string[] = []

  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      requests.push(`${request.method} ${url.pathname}`)

      if (url.pathname === "/api/plugin") return Response.json({ data: [{ id: "gui:fixture" }] })

      if (url.pathname === "/api/plugin/main")
        return Response.json({
          data: {
            options: {},
            source: `const { defineMain } = require("@opencode/plugin/gui/main")
            module.exports = {
              default: defineMain({
                id: "fixture",
                main(ctx) {
                  ctx.storage.set("ran", "yes")
                  return () => ctx.storage.delete("ran")
                },
              }),
            }`,
          },
        })

      return new Response("not found", { status: 404 })
    },
  })

  process.env.OPENCODE_DESKTOP_PLUGIN_MAIN = "1"

  try {
    const started = await startConfiguredMain({
      url: server.url.origin,
      password: "secret",
      storage: () => ({
        get: (key) => values.get(`fixture.${key}`),
        set: (key, value) => void values.set(`fixture.${key}`, value),
        delete: (key) => void values.delete(`fixture.${key}`),
      }),
      log: () => undefined,
    })

    expect(requests).toEqual(["GET /api/plugin", "POST /api/plugin/main"])
    expect(values.get("fixture.ran")).toBe("yes")
    expect(started.count).toBe(1)

    await started.stop()

    expect(values.has("fixture.ran")).toBe(false)
  } finally {
    server.stop(true)
  }
})

test("does nothing without the opt-in", async () => {
  const requests: string[] = []

  const server = Bun.serve({
    port: 0,
    fetch(request) {
      requests.push(request.url)

      return Response.json({ data: [{ id: "fixture" }] })
    },
  })

  delete process.env.OPENCODE_DESKTOP_PLUGIN_MAIN

  try {
    const started = await startConfiguredMain({
      url: server.url.origin,
      password: "secret",
      storage: () => ({ get: () => undefined, set() {}, delete() {} }),
      log: () => undefined,
    })

    expect(started.count).toBe(0)
    expect(requests).toEqual([])
  } finally {
    server.stop(true)
  }
})
