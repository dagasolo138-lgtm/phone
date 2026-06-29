# Phone Simulator

纯前端的 iPhone 模拟器与本地插件宿主原型。

## 文件结构

- `index.html`：完整手机模拟器、内置应用、插件 SDK 与 Agent 运行时。
- `plugins/dice.js`：最简插件模板，演示持久化状态与 Agent 工具。
- `plugins/dreams.js`：流式 LLM 与梦境档案示例。
- `plugins/imagine_friend.js`：虚拟朋友、长期记忆、主动通知示例。
- `manifest.json`：批量安装插件的 manifest 模板。

## 本地运行

直接打开 `index.html`，或用任意静态服务器启动。

## 插件说明

插件通过 `Phone.registerApp({...})` 注册。插件可使用独立持久化数据、UI 渲染、LLM 调用、通知、事件和 Agent 工具。

当前 URL 插件以页面脚本执行，具备完整页面权限；只安装可信代码。
