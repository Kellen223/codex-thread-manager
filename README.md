# Codex Thread Manager

> 一个本地的、零依赖的 Codex Thread Manager工具。浏览、搜索、批量清理按项目组织的 Codex 会话记录。

![screenshot](./screenshot.png)

## 为什么做

Codex 桌面端没有提供按项目查看和批量管理对话的能力。对话记录积少成多，既占磁盘又难以检索。这个工具给你一个网页界面，像文件管理器一样管理你的对话。

## 快速开始

```bash
git clone https://github.com/YOUR_USER/codex-threads.git
cd codex-threads

# 启动（需要 Codex 桌面环境，使用内置 Node.js）
./codex-threads start

# 打开浏览器
open http://127.0.0.1:8964
```

### 命令

| 命令 | 说明 |
|---|---|
| `./codex-threads start` | 启动服务（后台运行） |
| `./codex-threads stop` | 停止服务 |
| `./codex-threads status` | 查看运行状态 |

### 开机自启（macOS）

```bash
# 复制 plist 到 LaunchAgents
cp com.codex.threads.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.codex.threads.plist
```

## 功能

- 按项目目录分组查看对话
- 搜索项目、对话标题和内容
- 批量选择、删除、归档对话
- 磁盘占用可视化（对话文件 vs 日志库）
- 深色 / 浅色主题
- 轻量零依赖，不装任何包

## 技术实现

```
浏览器 ──HTTP──→ Node.js ──sqlite3 CLI──→ state_5.sqlite
```

| 层 | 技术 |
|---|---|
| 后端 | Node.js（Codex 内置） |
| 数据库查询 | 系统 `sqlite3 -json` CLI |
| 前端 | 单页 HTML + CSS + JS，无框架 |
| 外部依赖 | **零** |

一条命令都没有装——全靠系统和 Codex 自带的工具。

## 项目文件

```
├── server.js          # HTTP 服务
├── index.html         # 前端页面（全部内嵌）
├── codex-threads      # 命令行入口
├── start.sh           # 启动脚本
├── stop.sh            # 停止脚本
└── README.md
```

## License

MIT
