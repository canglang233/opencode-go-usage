# OpenCode Go Usage

> English · [中文](./README.zh-CN.md)

OpenCode TUI plugin that shows the remaining OpenCode Go usage in the session prompt and opens a detailed quota panel.

## Features

- Shows the rolling 5-hour remaining quota in `session_prompt_right`.
- Displays rolling, weekly, and monthly remaining quotas in the detail panel.
- Refreshes immediately in the background, then every 60 seconds.
- Uses the OpenCode Go usage API's `percent` as used quota and displays `100 - percent` as remaining quota.
- Reads credentials from `OPENCODE_GO_API_KEY` or OpenCode's local `auth.json`.
- Never stores or prints the API key; only a masked suffix is shown in the panel.

## Install

This repository is a local TUI plugin. Clone it into the OpenCode configuration directory and install its dependencies:

```powershell
git clone <private-repository-url> "$HOME\.config\opencode\tui-plugins\opencode-go-usage"
Set-Location "$HOME\.config\opencode\tui-plugins\opencode-go-usage"
npm install
```

Add the plugin to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/opencode-go-usage"]
}
```

Restart OpenCode after changing the TUI configuration or plugin code.

## Usage

Run OpenCode in a session. The indicator appears on the right side of the session prompt metadata row. Click it, or use `Ctrl+P` and select `OpenCode Go 用量明细`, to open the quota details.

The plugin uses the logged-in `opencode-go` credential from:

```text
~/.local/share/opencode/auth.json
```

An `OPENCODE_GO_API_KEY` environment variable takes precedence when set.

## Requirements

- OpenCode with the TUI plugin API, tested with OpenCode `1.18.18`
- Node.js/npm for installing local dependencies
- An OpenCode Go subscription or API key
