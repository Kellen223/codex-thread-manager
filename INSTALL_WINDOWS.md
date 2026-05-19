# Codex Thread Manager — Windows 安装指南

## 一行命令安装

在 Codex（Windows 版）中发送：

```
https://github.com/Kellen223/codex-thread-manager
```

Codex 会自动 clone 并安装。

## 启动

安装完成后，在 Codex 终端中执行：

```bash
cd codex-thread-manager
node server.js
```

然后浏览器打开：

```
http://127.0.0.1:8520
```

## 前提条件

- Codex Windows 版（内置 Node.js）
- 或自行安装 [Node.js](https://nodejs.org/)

## 停止

在终端按 `Ctrl + C` 即可停止服务。

## 常见问题

**Q: 提示 node 找不到？**  
A: 确保已安装 Node.js，或直接在 Codex 终端里运行。

**Q: 端口被占用？**  
A: 修改 `server.js` 第一行的 `PORT = 8964` 为其他端口。

---

> 有任何问题请提 GitHub Issue：
> https://github.com/Kellen223/codex-thread-manager/issues
