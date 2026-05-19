# Codex Thread Manager

> 一个本地的、零依赖的 Codex 对话管理工具。  
> 浏览、搜索、批量清理按项目组织的 Codex 对话记录。

---

## 安装

### 方式一：通过 Codex 安装（推荐）

直接把下面这个链接发给 Codex，它会自动完成剩下的：

```
https://github.com/Kellen223/codex-thread-manager
```

### 方式二：手动安装

```bash
git clone https://github.com/Kellen223/codex-thread-manager.git
cd codex-thread-manager
```

## 使用

### macOS（Codex 桌面环境）

```bash
# 启动
./codex-threads start

# 打开浏览器
open http://127.0.0.1:8964

# 停止
./codex-threads stop

# 查看状态
./codex-threads status
```

### Windows / 其他环境

需要先安装 Node.js（[下载](https://nodejs.org/)），然后：

```bash
node server.js
```

然后浏览器打开 `http://127.0.0.1:8964`。

### 开机自启（macOS）

```bash
cp com.codex.threads.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.codex.threads.plist
```

## 功能

- 按项目目录分组查看对话
- 搜索项目、对话标题和内容
- 批量选择、删除、归档对话
- 磁盘占用可视化（对话文件 vs 日志库）
- 深色 / 浅色主题
- 零外部依赖

## 技术实现

```
浏览器 ──HTTP──→ Node.js ──sqlite3 CLI──→ state_5.sqlite
```

| 层 | 技术 |
|---|---|
| 后端 | Node.js |
| 数据库查询 | 系统 `sqlite3 -json` CLI |
| 前端 | 单页 HTML + CSS + JS，无框架 |
| 外部依赖 | **零** |

## 项目文件

```
├── server.js          # HTTP 服务
├── index.html         # 前端页面
├── codex-threads      # 命令行入口
├── start.sh           # 启动脚本（macOS）
├── stop.sh            # 停止脚本（macOS）
└── README.md
```

## License

MIT
