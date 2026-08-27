# 演Xi后端 API

后端为 Express + SQLite，默认监听 `http://localhost:3001`。当前数据库是可复现的演示数据，报告基准日为 2026-08-08。

## 启动

```bash
cd theater-dashboard/server
npm install
npm run seed
npm test
npm run dev
```

可选环境变量：

- `PORT`：服务端口，默认 `3001`
- `CORS_ORIGIN`：允许的前端来源，默认 `http://localhost:5173`
- `THEATER_DB_PATH`：SQLite 文件路径，默认 `theater-dashboard/data/theater.db`

## 返回格式

成功：

```json
{ "data": {} }
```

失败：

```json
{ "error": { "code": "BAD_REQUEST", "message": "错误说明" } }
```

## 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/dashboard/summary` | 首页四项核心指标及环比 |
| GET | `/api/dashboard/trends` | 每日票房与媒体声量趋势 |
| GET | `/api/dashboard/channels` | 所选周期渠道贡献 |
| GET | `/api/dashboard/operations` | 按日/周/月汇总售票数/金额、宣传量、会员及新媒体粉丝增长 |
| GET | `/api/dashboard/shows` | 首页演出卡片 |
| GET | `/api/dashboard/alerts` | 异常预警 |
| GET | `/api/shows` | 演出列表及筛选 |
| GET | `/api/shows/:id` | 单场演出完整分析数据 |
| GET | `/api/reviews/channels` | 跨演出渠道效率排名 |
| GET | `/api/reviews/strategies` | 策略效果及最佳实践 |
| GET | `/api/agent/capabilities` | 智能问数支持范围 |
| POST | `/api/agent/query` | 受控自然语言查询 |

日期接口统一支持 `start=YYYY-MM-DD&end=YYYY-MM-DD`，或使用 `days=30`。趋势接口额外支持 `platform=all|xiaohongshu|douyin|wechat|external`；演出及复盘接口支持 `type` 筛选。

智能问数 V1 使用服务端白名单查询模板，不接收或执行客户端 SQL。这样在尚未配置 LLM 密钥时也可以稳定演示，并避免只读边界被绕过。后续接入 LLM 时，应让模型只负责识别结构化意图，SQL 仍由服务端模板生成。

## 指标口径

- 默认周期：数据中最新日期向前 30 天。
- 总票房：周期内订单票面金额之和。
- 上座率：周期内售票张数 / 周期内有销售的演出总可售票数。
- 售票完成率：累计售票数 / 预计售票数；预计售票数由项目台账维护。
- 总宣传量：小红书笔记 + 公众号次数 + 外部评论 + 抖音点赞 / 100；该值是演示用归一化指数，不等同于真实曝光量。
- 会员增长数：按日期录入或汇总的新增会员数量。
- 新媒体粉丝数增长：所选周期内各新媒体账号新增粉丝数之和。
- 单场上座率：该演出累计售票数 / 总发售票数。
- 策略 ROI：人工录入影响金额 / 策略花费，不代表自动归因结果。
