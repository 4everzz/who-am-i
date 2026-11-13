import type { Note } from '../types/note';

export const notes: readonly Note[] = [
  {
    "href": "posts/why-vector-not-enough.html",
    "type": "检索 / RAG",
    "title": "为什么纯向量检索不够用：BM25 + RRF 混合检索实践",
    "description": "从纯向量检索的两个短板出发，讲清 BM25 关键词检索、RRF 倒数排名融合，以及中文场景下 jieba 预分词的必要性。附 39 题消融实测数据。"
  },
  {
    "href": "posts/hitl-three-bugs.html",
    "type": "测试 / 排障",
    "title": "38 个单测全绿，功能一次都没触发过",
    "description": "HITL 人工决策功能 38 个单测全绿、全量 977 passed，但真实链路上一次都没触发。三个 bug 叠成一条死链，记录排查过程与三条判据。"
  },
  {
    "href": "posts/dimension-mismatch.html",
    "type": "排障 / 工程习惯",
    "title": "同一个错犯了五次：阈值与判据的量纲必须匹配",
    "description": "为场景 A 推出的阈值拿去判场景 B，后果是该触发的永不触发、不该触发的每次都触发。记录五次量纲错配事故与一条动手前的自查问题。"
  },
  {
    "href": "posts/eval-integrity.html",
    "type": "评测 / 可信度",
    "title": "评测工具比业务代码更危险：一次让历史分数全部作废的排查",
    "description": "业务错了用户能看见，度量错了所有人都看不见。记录 RAG 评测中三个静默缺陷：取错产物、repr 污染上下文、指纹漏掉被测代码。"
  },
  {
    "href": "posts/bounded-react-agent.html",
    "type": "AI / Agent",
    "title": "手写一个有限的 ReAct Agent：为什么不用框架，以及边界怎么划",
    "description": "单 Agent、有限工具、短上下文场景下，手写 ReAct 循环比引入框架更可控。记录工具权限、输出契约、SSE 生命周期与降级设计。"
  },
  {
    "href": "posts/multi-agent-boundary.html",
    "type": "多智能体 / 编排",
    "title": "多 Agent 不是越多越好：拆分的边界在哪",
    "description": "从一个 Agent 同时处理分诊、审查、排障时的上下文污染讲起，说明多智能体拆分的判据不是任务数量，而是上下文能否隔离、失败能否归因，以及为「拆」付出的三条工程代价。"
  },
  {
    "href": "posts/why-not-ragas.html",
    "type": "评测 / 依赖",
    "title": "为什么我不用 RAGAS：一次依赖降级的取舍",
    "description": "评测框架能省很多事，但要看它把你的依赖树拽到哪。记录一次 ragas 与 langchain-openai 的版本冲突，以及为什么最后选择自实现句级断言评测。"
  },
  {
    "href": "posts/mcp-cold-start.html",
    "type": "性能 / MCP",
    "title": "MCP 首次调用 59.6 秒：三个瓶颈叠在一起",
    "description": "拆开启动与握手、异常清理和会话复用：同一条冷启动验收链路从 59.6 秒降到 6.0 秒，不代表平均响应时间。"
  },
  {
    "href": "posts/false-refusal-zero.html",
    "type": "评测 / 质量",
    "title": "19 个误拒答，是怎么一个个归零的",
    "description": "不是调一个阈值就完事。19 条错例逐条归类，五类原因对应五种修法，改完还要确认没有把误答换进来。"
  },
  {
    "href": "posts/agent-stop-conditions.html",
    "type": "AI / 工程规范",
    "title": "Agent 循环没有停止条件，就是在等事故",
    "description": "max_steps、token 预算、墙钟上限、人工接管点——四道闸缺一道，跑飞只是时间问题。"
  },
  {
    "href": "posts/sse-reconnect.html",
    "type": "流式 / 前端",
    "title": "SSE 断线之后，前端为什么收到半句话",
    "description": "重连没有事件 ID 和游标，服务端从头推，前端把两段拼成一句——看起来像模型说胡话，实际是传输层的问题。"
  },
  {
    "href": "posts/family-member-race.html",
    "type": "并发 / 数据库",
    "title": "六个人同时点加入，家庭成员上限失效了",
    "description": "先查人数再插入，在并发下必然超限。行锁把「检查 + 写入」变成一个原子动作，代价是锁的持有时间要短。"
  },
  {
    "href": "posts/prompt-as-code.html",
    "type": "工程化 / Prompt",
    "title": "Prompt 改了没人知道，比改错更麻烦",
    "description": "提示词散落在代码字符串里，改了什么、什么时候改的、评测分数对应哪一版，全都说不清。"
  },
  {
    "href": "posts/canary-metrics.html",
    "type": "发布 / 可观测",
    "title": "灰度只放 5% 流量，该看哪三个指标",
    "description": "成功率看稳定性、P95 看体验、拒答率看质量。前两个发现故障，第三个发现退化，缺一个都可能把问题放到全量。"
  }
];
