# Codex Thread Manager

> 一个本地的、零依赖的 Codex 对话管理工具。  
> 浏览、搜索、批量清理按项目组织的 Codex 对话记录。

---

## 安装

把下面这个链接发给 Codex，它会自动 clone 并提示启动：

```
https://github.com/Kellen223/codex-thread-manager
```

clone 完后 Codex 会问你是否要运行，选择 **是**，然后浏览器打开：

```
http://127.0.0.1:8520
```

就完了。

如果 Codex 没有自动提示，在终端里运行：

```bash
node server.js
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

## License

MIT
