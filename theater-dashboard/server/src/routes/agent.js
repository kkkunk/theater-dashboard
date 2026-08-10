import { Router } from 'express';
import { answerQuestion } from '../agent/query-agent.js';

export function agentRouter(db) {
  const router = Router();
  router.post('/query', (req, res) => {
    const data = answerQuestion(db, String(req.body?.question || ''), req.body || {});
    res.json({ data });
  });
  router.get('/capabilities', (_req, res) => res.json({ data: {
    mode: 'controlled-template',
    questions: [
      '最近30天票房最高的5场演出',
      '最近30天小红书声量前3的演出，上座率怎么样',
      '抖音渠道贡献最高的5场演出',
      '哪些演出的售票完成率低于80%',
      '本月总售票数、总宣传量和会员增长数分别是多少',
      '哪类策略ROI最高',
    ],
  } }));
  return router;
}
