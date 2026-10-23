import { defineMain } from "@opencode/plugin/gui/main"

export default defineMain({
  id: "launch-log",
  main(context) {
    const previous = context.storage.get("last")
    const last = new Date().toISOString()

    context.storage.set("last", last)
    context.log("info", "desktop launch recorded", { previous: previous ?? null, last })
  },
})
