# 演析 · 演出宣发转化看板

React + Express + SQLite 的桌面端数据看板演示项目。

## 本地运行

打开两个终端：

```bash
cd theater-dashboard/server
npm install
npm run seed
npm run dev
```

```bash
cd theater-dashboard/client
npm install
npm run dev
```

访问 `http://localhost:5173`。Vite 会将 `/api` 代理到 `http://localhost:3001`。

## 校验

```bash
cd theater-dashboard/server
npm test
```

```bash
cd theater-dashboard/client
npm run typecheck
npm run build
```

## 页面

- `/`：经营总览，包括核心指标、双轴趋势、异常雷达、渠道/观众结构和演出卡片。
- `/shows/:id`：单场演出分析，包括策略节点、票房曲线、渠道、画像、销售时段及 ROI。
- `/reviews`：渠道和策略跨项目复盘。
- 全局“智能问数”：受控模板查询，不执行客户端提交的 SQL。

产品闭环见 [PRODUCT.md](./PRODUCT.md)，视觉与组件规则见 [DESIGN.md](./DESIGN.md)，后端接口见 [server/README.md](./server/README.md)。
