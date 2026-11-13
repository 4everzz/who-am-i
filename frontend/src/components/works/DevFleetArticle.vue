<template>
<section class="project-section">
      <h3>问题</h3>
      <p>
        研发判断一条 PR 能不能合并，要在任务、代码改动、评审意见、构建日志与本地文档之间来回跳，
        一个 PR 常要看五六个页面。信息是散的，结论也就没法复核。
      </p>
      <p>
        目标是把这些信息组织成一个可检索、可引用的证据库，让 AI 回答三个具体问题：
        这个任务该谁做、这个改动该不该合、这次构建为什么失败。
      </p>
    </section>

    <section class="project-section">
      <h3>架构与职责</h3>
      <p>首页展示跨领域问题的简化协作链路。系统还包含数据接入、证据检索与写操作治理；各部分职责如下。</p>
      <div class="dlg-items">
        <div class="dlg-item">
          <h4>研发数据底座</h4>
          <p>经 GitHub REST API 同步六类数据（任务、代码改动、评审意见、构建记录、失败日志、项目文档），
             单 / 多仓库周报一次汇总。统计数字由代码聚合，不让模型生成。</p>
        </div>
        <div class="dlg-item">
          <h4>有出处的问答</h4>
          <p>结构感知切片后语义 + 关键词双路召回，再 Rerank 二次排序；按 <code>repo_id</code> 隔离，
             强制编号引用、可回溯原文。Milvus 不可用时自动降级为关键词检索，宁可答得糙也不答不出。</p>
        </div>
        <div class="dlg-item">
          <h4>多智能体编排</h4>
          <p>分诊、审查、排障各交给一个专职 Agent；跨领域问题由 Planner 拆成带依赖的任务，
             Orchestrator 按依赖调度，可并行的任务并行执行；Observer 校验证据缺口与结论冲突，
             最后由 Synthesis 汇总为带引用、可逐条核对的建议。</p>
        </div>
        <div class="dlg-item">
          <h4>写操作要人点头</h4>
          <p>评论、关任务、加标签统一转为 ActionDraft，过权限校验与人工确认才真正调用 GitHub API，
             全程落 AuditLog；SSE 实时推送工具调用与执行进度。</p>
        </div>
        <div class="dlg-item">
          <h4>执行边界与故障处理</h4>
          <p>单任务设 90 秒超时；上游依赖失败时跳过下游任务，避免带着残缺证据继续执行。
             Token 预算与调用熔断约束整条链路的成本。</p>
        </div>
      </div>
    </section>

    <section class="project-section">
      <h3>关键取舍</h3>

      <details class="qa">
        <summary>为什么要拆成多 Agent，一个 Agent 加工具不够吗？</summary>
        <div class="qa-body">
          <p>单 Agent 处理跨领域问题时，检索、审查、排障的证据会挤在同一段上下文里互相污染，
             而且一旦答错很难判断是哪一步出的问题。拆成三个专职 Agent 后，每段上下文边界清晰、失败可归因。</p>
          <p>代价是链路更长、失败点更多，所以配了两条硬约束：单任务 90 秒超时，依赖失败沿链路传播并跳过下游——
             一个环节挂了不会把整条链路卡死。</p>
        </div>
      </details>

      <details class="qa">
        <summary>周报数字为什么不让模型算？</summary>
        <div class="qa-body">
          <p>让模型数数是最容易出错、又最难被发现的地方。新增多少任务、合并多少 PR、失败多少次构建，
             这些由代码聚合后直接填进模板，模型只负责组织语言。数字和措辞的责任分开。</p>
        </div>
      </details>

      <details class="qa">
        <summary>向量库挂了怎么办？</summary>
        <div class="qa-body">
          <p>降级为关键词检索。回答质量会下降，但结论仍然带出处、仍然可核对，
             比直接抛一个 500 更有用。降级会显式标注，不假装一切正常。</p>
        </div>
      </details>

      <details class="qa">
        <summary>为什么写操作一定要人工确认？</summary>
        <div class="qa-body">
          <p>评论、关闭 Issue、加标签会改变外部状态，而且不可撤销。所以统一先生成草稿，
             权限校验通过后等人点确认，最后写审计日志。执行过程用 SSE 实时可见，
             能看到调用了什么工具、进度到哪一步。</p>
        </div>
      </details>
    </section>

    <section class="project-section">
      <h3>结果</h3>
      <div class="dlg-metrics">
        <div><b>209</b><span>项自动化测试通过</span></div>
        <div><b>6</b><span>类研发数据统一接入</span></div>
        <div><b>5 → 1</b><span>合并审查的核查入口</span></div>
      </div>
      <p class="dlg-footnote">
        Agent、检索与结构化输出均有评测集校验；架构、开发与部署由我独立完成。
      </p>
    </section>

    <section class="project-section">
      <h3>技术栈</h3>
      <ul class="chips chips-lg">
        <li>Python</li><li>FastAPI</li><li>LangChain</li><li>LangGraph</li><li>Milvus</li>
        <li>MCP</li><li>SSE</li><li>PostgreSQL</li><li>Next.js</li><li>Docker Compose</li>
      </ul>
    </section>
</template>
