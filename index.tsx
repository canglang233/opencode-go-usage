/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
const POLL_MS = 60_000
const BAR_WIDTH = 10
const LABEL = "go"

type Tier = { status: string; percent: number; resetsAt: string }
type Usage = { rolling: Tier; weekly: Tier; monthly: Tier }

type KeyInfo = { key: string; source: "env" | "auth" | "none"; tail: string }

const EMPTY_KEY_INFO: KeyInfo = { key: "", source: "none", tail: "" }

const BLOCK = "\u2588"
const EMPTY = "\u2591"

const TIERS = [
  { key: "rolling", label: "5小时额度", short: "5h" },
  { key: "weekly", label: "周额度", short: "周" },
  { key: "monthly", label: "月额度", short: "月" },
] as const

function maskTail(key: string): string {
  if (key.length <= 8) return "****"
  return `${key.slice(0, 3)}****${key.slice(-4)}`
}

async function resolveKey(): Promise<KeyInfo> {
  if (typeof process !== "undefined" && process.env.OPENCODE_GO_API_KEY) {
    return { key: process.env.OPENCODE_GO_API_KEY, source: "env", tail: maskTail(process.env.OPENCODE_GO_API_KEY) }
  }
  try {
    const { homedir } = await import("node:os")
    const { readFile } = await import("node:fs/promises")
    const auth = JSON.parse((await readFile(`${homedir()}/.local/share/opencode/auth.json`, "utf8")).replace(/^\uFEFF/, ""))
    const key = auth?.["opencode-go"]?.key
    if (typeof key === "string" && key) {
      return { key, source: "auth", tail: maskTail(key) }
    }
  } catch {
    // auth.json 不可读则回退
  }
  return { key: "", source: "none", tail: "" }
}

async function fetchUsage(key: string): Promise<Usage | undefined> {
  try {
    const res = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) return undefined
    const body = await res.json()
    return body?.usage as Usage | undefined
  } catch {
    return undefined
  }
}

function remaining(tier: Tier): number {
  return Math.max(0, Math.min(100, 100 - tier.percent))
}

function bar(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent))
  const filled = Math.round((clamped / 100) * BAR_WIDTH)
  return BLOCK.repeat(filled) + EMPTY.repeat(Math.max(0, BAR_WIDTH - filled))
}

function fmtReset(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return `今天 ${hm}`
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `明天 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

function colorFor(percent: number, theme: Record<string, unknown>): unknown {
  if (percent < 30) return theme.error
  if (percent < 60) return theme.warning
  return theme.success
}

function showDetails(api: TuiPluginApi, usage: Usage | undefined, key: KeyInfo) {
  const theme = api.theme.current
  const sourceLabel = key.source === "env" ? "环境变量" : key.source === "auth" ? "auth.json" : "未找到"

  const tierRow = (t: (typeof TIERS)[number]) => {
    const tier = usage?.[t.key]
    const left = tier ? Math.round(remaining(tier)) : NaN
    const color = colorFor(left, theme)
    return (
      <box flexDirection="column" gap={0}>
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.text}>{t.label}</text>
          <text fg={color}>{Number.isNaN(left) ? "获取失败" : `剩余 ${left}%`}</text>
        </box>
        <text fg={color}>{Number.isNaN(left) ? "" : bar(left)}</text>
        <text fg={theme.textMuted}>{tier?.resetsAt ? `重置 ${fmtReset(tier.resetsAt)}` : ""}</text>
      </box>
    )
  }

  api.ui.dialog.setSize("medium")
  api.ui.dialog.replace(() => (
    <box flexDirection="column" gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={4} paddingRight={4}>
        <text fg={theme.text}>
          <b>OpenCode Go 额度</b>
        </text>
        <text fg={theme.textMuted} onMouseUp={() => api.ui.dialog.clear()}>
          esc
        </text>
      </box>
      <box flexDirection="column" gap={1} paddingLeft={4} paddingRight={4}>
        <text fg={theme.textMuted}>
          Key: {key.tail || "—"}（{sourceLabel}）· 每 {POLL_MS / 1000}s 自动刷新
        </text>
        {tierRow(TIERS[0])}
        {tierRow(TIERS[1])}
        {tierRow(TIERS[2])}
      </box>
    </box>
  ))
}

const tui: TuiPlugin = async (api, options) => {
  if (options?.enabled === false) return

  let keyInfo: KeyInfo | undefined

  const [usage, setUsage] = createSignal<Usage | undefined>()
  let lastLow: Record<string, boolean> = {}

  const refresh = async () => {
    if (!keyInfo || keyInfo.source === "none") return
    const next = await fetchUsage(keyInfo.key)
    if (next) {
      setUsage(next)
      for (const t of TIERS) {
        const tier = next[t.key]
        if (!tier) continue
        const low = remaining(tier) < 30
        const prev = lastLow[t.key] ?? false
        if (low && !prev) {
          api.ui.toast({
            variant: "warning",
            title: "OpenCode Go 额度不足",
            message: `${t.label} 剩余 ${Math.round(remaining(tier))}%，注意用量`,
            duration: 6000,
          })
        }
        lastLow = { ...lastLow, [t.key]: low }
      }
    }
  }

  const timer = setInterval(refresh, POLL_MS)
  api.lifecycle.onDispose(() => clearInterval(timer))

  const indicator = (ctx: { theme: typeof api.theme }) => {
    const u = usage()
    if (!u || !keyInfo || keyInfo.source === "none") return null
    const tier = u.rolling
    if (!tier) return null
    const left = Math.round(remaining(tier))
    const color = colorFor(left, ctx.theme.current)
    return (
      <text onMouseUp={() => showDetails(api, u, keyInfo ?? EMPTY_KEY_INFO)}>
        <span style={{ fg: ctx.theme.current.textMuted }}>{LABEL} </span>
        <span style={{ fg: color }}>{bar(left)} {left}%</span>
      </text>
    )
  }

  api.slots.register({
    slots: {
      session_prompt_right: (ctx) => indicator(ctx),
    },
  })

  api.keymap.registerLayer({
    commands: [
      {
        name: "opencode-go-usage.show",
        title: "OpenCode Go 用量明细",
        category: "Plugin",
        namespace: "palette",
        run: () => showDetails(api, usage(), keyInfo ?? EMPTY_KEY_INFO),
      },
    ],
  })

  void (async () => {
    keyInfo = await resolveKey()
    if (api.lifecycle.signal.aborted) return
    await refresh()
  })().catch(() => {})
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-go-usage",
  tui,
}

export default plugin
