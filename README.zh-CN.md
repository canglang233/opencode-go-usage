# OpenCode Go 用量

OpenCode TUI 插件：在会话提示符中显示 OpenCode Go 剩余用量，并支持打开详细额度面板。

## 功能

- 在 `session_prompt_right` 中显示 5 小时滚动剩余额度。
- 详情面板展示滚动、周、月剩余额度。
- 启动后立即在后台刷新，之后每 60 秒刷新一次。
- 使用 OpenCode Go 用量 API 的 `percent` 作为已用额度，显示 `100 - percent` 作为剩余额度。
- 从 `OPENCODE_GO_API_KEY` 或 OpenCode 本地的 `auth.json` 读取凭据。
- 不存储、不打印 API Key，面板中仅显示掩码后的尾部。

## 安装

本仓库是一个本地 TUI 插件。克隆到 OpenCode 配置目录并安装依赖：

```powershell
git clone <私有仓库地址> "$HOME\.config\opencode\tui-plugins\opencode-go-usage"
Set-Location "$HOME\.config\opencode\tui-plugins\opencode-go-usage"
npm install
```

在 `~/.config/opencode/tui.json` 中注册插件：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/opencode-go-usage"]
}
```

修改 TUI 配置或插件代码后，需要重启 OpenCode 生效。

## 使用

运行 OpenCode 会话，提示符元数据行右侧会出现用量指示器。点击它，或使用 `Ctrl+P` 选择 `OpenCode Go 用量明细`，即可打开额度详情。

插件使用已登录的 `opencode-go` 凭据，读取自：

```text
~/.local/share/opencode/auth.json
```

设置了 `OPENCODE_GO_API_KEY` 环境变量时优先使用该变量。

## 环境要求

- 支持 TUI 插件 API 的 OpenCode（已在 OpenCode `1.18.18` 上测试）
- Node.js/npm（用于安装本地依赖）
- OpenCode Go 订阅或 API Key
