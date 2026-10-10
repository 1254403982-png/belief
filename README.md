# 信念

一个帮助你记录念头、梳理思绪，并逐渐看清自己信念的网页工具。体验地址：[belief-five.vercel.app](https://belief-five.vercel.app/)。

你可以先自由书写，再决定是否让 AI 问一个问题；只有主动选择“整理到这里”，才会看到简短的候选理解。原话、草稿、问答和改写会保留，AI 给出的信念层次只是建议，由你决定是否加入画布。

目前所有功能对用户免费，无需激活码。AI 功能依赖站点配置 DeepSeek 服务；服务不可用时，仍可手动记录与整理。

## 已有功能

- 单画布查看信念节点及连接，手动记录念头和情绪。
- “我的探索”支持自由书写、单问题多轮问询、主动整理与逐条入图。
- 书籍学习默认解释已收录的书中概念，可按次选择是否结合自己的信念；回答支持加粗和列表显示。
- 我的待办、定期回顾，以及 JSON / Markdown 导出。
- 本地账号隔离：同一浏览器中的不同账号拥有各自的记录。

## 当前数据范围

账号与记录保存在当前浏览器的 IndexedDB 中。**相同账号名在不同设备或浏览器上不会自动同步**；清除浏览器数据可能丢失记录，请定期在设置中导出 JSON 备份。云端身份、同步与旧数据迁移仍在规划中，见 [云同步方案](docs/cloud-sync-plan.md)。

## 本地运行

需要 Node.js 和 npm。

```bash
npm install
npm run dev
```

执行 `npm test` 运行测试，`npm run build` 生成生产构建。未配置模型凭据时，AI 请求会降级为手动模式。当前代码仍由浏览器直接调用 DeepSeek；`VITE_` 环境变量会被打包到前端，**不能当作私密的生产环境密钥**。正式公开部署 AI 服务前，应按[云同步方案](docs/cloud-sync-plan.md)迁移到服务端代理并加入登录鉴权。

技术栈：React 18、TypeScript、Vite、Tailwind CSS、Zustand、Dexie.js、Framer Motion、Canvas API。

项目进度与设计资料见 [开发计划](docs/development-plan.md)、[功能需求](docs/requirements.md)和[技术方案](docs/tech-spec.md)。
