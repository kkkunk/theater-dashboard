# 演析 · 营销数据看板

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

- `/`：经营总览，包括项目搜索、票房与新媒体核心指标、票房/宣传趋势、五平台互动占比、经营总表、三渠道贡献和演出卡片。
- `/shows/:id`：单场演出分析，包括预计售票目标、完成进度、策略节点、票房曲线、渠道、销售时段及 ROI。
- `/reviews`：渠道和策略跨项目复盘。
- `/members`：会员售票分析入口；当前源文件缺少手机号字段，页面保留真实缺数提示，待补充授权数据后启用查询。
- 全局“智能问数”：受控模板查询，不执行客户端提交的 SQL。

当前统计口径：票面金额为 0 的票按赠票识别并从总售票数、上座率和完成率中排除；售票渠道仅保留保利、大麦、其他；平台净增粉丝按期末粉丝数减期初粉丝数计算。

产品闭环见 [PRODUCT.md](./PRODUCT.md)，视觉与组件规则见 [DESIGN.md](./DESIGN.md)，后端接口见 [server/README.md](./server/README.md)。
