import type { Project } from '../types/project';

export const projects: readonly Project[] = [
  {
    "id": "p-devfleet",
    "name": "DevFleet",
    "subtitle": "Multi-Agent 研发协作平台",
    "intro": "把研发数据、证据检索和 Agent 协作放到同一条链路里，让任务分诊、代码审查与构建排障都有出处可查。",
    "tags": [
      {
        "label": "个人项目",
        "className": "tag tag-accent"
      },
      {
        "label": "Multi-Agent 编排",
        "className": "tag"
      }
    ],
    "points": [
      "Planner 拆解任务，专职 Agent 分别处理分诊、审查和排障。",
      "结论带编号引用，资料按仓库隔离；写操作经过人工确认并留下审计。"
    ],
    "buttonLabel": "查看架构与设计",
    "url": null,
    "aside": {
      "kicker": "AGENT ORCHESTRATION",
      "title": "多智能体协同与证据治理",
      "flow": [
        "任务拆解",
        "并行调度",
        "证据校验"
      ],
      "description": "专职 Agent 按依赖协作，结论可追溯；外部写操作经人工确认并留痕。"
    }
  },
  {
    "id": "p-menu",
    "name": "小家开饭啦",
    "subtitle": "家庭饮食管理与 AI 助手",
    "intro": "把菜单、冰箱库存和用餐计划放在一起，让 AI 根据已有食材给出建议，同时把写入权限留给用户确认。",
    "tags": [
      {
        "label": "已上线",
        "className": "tag tag-live"
      },
      {
        "label": "全栈交付",
        "className": "tag"
      }
    ],
    "points": [
      "一套 UniApp + Vue 3 交付 H5、小程序和 App，后台独立维护。",
      "手写有限 ReAct，只开放只读工具；数据库行锁收敛并发加入家庭的竞态。"
    ],
    "buttonLabel": "查看项目详情",
    "url": "https://menu.zmeety.cn",
    "aside": {
      "kicker": "AGENT ENGINEERING",
      "title": "有限步数的 ReAct 智能体",
      "flow": [
        "只读工具",
        "步数约束",
        "人工确认"
      ],
      "description": "手写 Agent 循环与 MCP 接入，以明确的执行边界控制工具调用和业务写入。"
    }
  },
  {
    "id": "p-zhiyuan",
    "name": "智愿通",
    "subtitle": "高考志愿填报智能体",
    "intro": "将招生信息变成可追溯的问答系统。检索、事实校验和评测一起约束每个分数、位次与建议。",
    "tags": [
      {
        "label": "问答系统",
        "className": "tag"
      },
      {
        "label": "RAG 质量工程",
        "className": "tag"
      }
    ],
    "points": [
      "向量与关键词双路召回后用 RRF 融合，领域词典随结构化数据更新。",
      "状态机串联抽取、校验、SQL 和事实保护；自建评测集防止误拒答和过期报告。"
    ],
    "buttonLabel": "查看项目详情",
    "url": null,
    "aside": {
      "kicker": "RAG QUALITY",
      "title": "混合检索与事实校验",
      "flow": [
        "双路召回",
        "RRF 融合",
        "事实保护"
      ],
      "description": "结构化校验与回归评测共同约束回答；35 题评测中误拒答从 19 降至 0。"
    }
  }
];
