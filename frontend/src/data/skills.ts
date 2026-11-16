import type { Principle, SkillGroup, StackGroup } from '../types/skills';

export const stackGroups: readonly StackGroup[] = [
  {
    key: 'A',
    title: 'AI 应用',
    items: [
      ['Agent', 'Python、FastAPI、LangChain、LangGraph、MCP、手写 ReAct'],
      ['RAG', '混合检索、RRF、Rerank、引用溯源、忠实度评测'],
    ],
  },
  {
    key: 'B',
    title: '后端与数据',
    items: [
      ['数据层', 'PostgreSQL、pgvector、MySQL、Redis（Lua 原子限流）'],
      ['工程', 'SQLAlchemy 2 异步 ORM、Alembic、JWT 鉴权、行锁与幂等设计'],
    ],
  },
  {
    key: 'C',
    title: '前端与交付',
    items: [
      ['前端', 'UniApp、Vue 3、TypeScript、React、Next.js'],
      ['交付', 'Docker Compose、Nginx、Linux、HTTPS 与证书自动续期'],
    ],
  },
  {
    key: 'D',
    title: '工程与安全',
    items: [
      ['质量', 'pytest、自实现忠实度与引用评测、数据质量规则引擎'],
      ['安全', 'bcrypt、登录防枚举、越权逐接口校验、上传校验'],
    ],
  },
];

export const skillGroups: readonly SkillGroup[] = [
  {
    title: 'AI 应用',
    paragraphs: [
      'Python、FastAPI、LangChain、LangGraph、MCP 和手写 ReAct。主要用于检索增强生成、工具调用、多 Agent 编排和流式响应。',
      '我更关注工具边界、状态管理和失败路径，而不是只把模型调用包在一个函数里。',
    ],
  },
  {
    title: '数据与检索',
    paragraphs: [
      'PostgreSQL、pgvector、Milvus、BM25、RRF、Rerank、Redis 和 jieba。实际工作包括数据隔离、索引迁移、检索融合、缓存和计数。',
      '检索系统需要同时关注召回质量、证据可解释性、延迟和数据更新成本。',
    ],
  },
  {
    title: '前端与交付',
    paragraphs: [
      'HTML、CSS、JavaScript、Vue 3、UniApp、TypeScript、React 和 Next.js。这些技术分别用于个人站、家庭菜单和项目中的交互页面。',
      '部署侧使用 Docker Compose、Nginx、Linux、HTTPS 和阿里云服务器，能够把页面、接口和数据服务放到同一条可检查的链路上。',
    ],
  },
  {
    title: '工程质量',
    paragraphs: [
      'SQLAlchemy 2 异步 ORM、Alembic、JWT 鉴权、pytest、SSE、幂等设计和数据库事务。工程质量不只靠测试数量，还要确认测试真的执行到了关键边界。',
      '用评测集和回归测试复查一次改动的收益，也记录依赖、延迟和可维护性方面的代价。',
    ],
  },
];

export const principles: readonly Principle[] = [
  {
    title: '先问是否真的需要 Agent',
    description: '能用一次模型调用、明确规则或固定流程解决的问题，不增加自主循环。Agent 会引入不确定性、成本和运维负担，它应该解决真实的协调问题。',
  },
  {
    title: '没有停止条件的循环就是事故',
    description: '每个自主循环都要有步骤上限、Token 预算、墙钟上限和人工接管点。写不出停止条件，就不应该上线。',
  },
  {
    title: '约束必须可以被验证',
    description: '“回答要有出处”不能只写在提示词里，还需要引用结构、代码级校验和评测集。说不清怎么检查的约束，等于没有约束。',
  },
  {
    title: '不为了新技术而上线',
    description: '如果一层新技术只带来很小的收益，却增加延迟、依赖或故障面，就应该主动关掉。把取舍写进默认配置，比在分享里讲一句更可靠。',
  },
];
