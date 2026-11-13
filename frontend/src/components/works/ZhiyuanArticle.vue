<template>
<section class="project-section">
      <h3>问题</h3>
      <p>
        高考志愿填报高峰期，学生与家长反复查询「这个分数能上什么学校」「这个专业有什么要求」，
        招生老师每天重复回答。信息散落在各省考试院官网、高校招生网与 PDF 章程里，人工比对耗时且易错。
      </p>
      <p>
        结构化语料含 13 省 65 万余行招生与分数位次，另有院校档案。
        难点不是「能回答」，而是答案里的每个数字都能回溯出处，并且不该拒答的不拒答。
      </p>
    </section>

    <section class="project-section">
      <h3>做法</h3>
      <div class="dlg-items">
        <div class="dlg-item">
          <h4>检索</h4>
          <p>pgvector 向量召回 + tsvector 关键词召回双路并行，用 RRF 融合排序；
             jieba 的领域词典从结构化库动态读取约 2,000 个高校名与 1,200 个专业名，
             数据更新后自动跟随，「郑轻」「河大」这类简称不再漏检。</p>
        </div>
        <div class="dlg-item">
          <h4>可信与引用</h4>
          <p>回答强制带编号引用，并做代码级校验；自建句级断言的忠实度评测，
             报告带指纹防过期、逐题落盘可断点续跑。编造内容直接判不合格。</p>
        </div>
        <div class="dlg-item">
          <h4>事实保护</h4>
          <p>LangGraph 状态机串联「抽取 → 校验 → 参数化 SQL → 冲稳保打标 → 事实校验」，
             模型改写过的分数、位次一律打回重来。条件缺失时引导补全，而不是猜。</p>
        </div>
        <div class="dlg-item">
          <h4>评测与数据质量</h4>
          <p>100 题评测集（39 基础 + 61 口语化难题）；147 条规则的数据质量引擎扫描 213,283 行，
             定位 17 条失败规则，其中 8 条会直接导致答错。测试从 0 建到 1,416 条。</p>
        </div>
      </div>
    </section>

    <section class="project-section">
      <h3>关键取舍</h3>

      <details class="qa">
        <summary>为什么最后把 Rerank 关掉了？</summary>
        <div class="qa-body">
          <p>39 题四档消融里，从 wide 到 rerank 首位命中率提升不到 0.1 个百分点，延迟却增加
             P50 +405ms / P95 +625ms。收益很小、成本是确定的，所以保留能力、默认关闭，
             并把这个结论写进配置注释，避免以后有人再「顺手加上」。</p>
        </div>
      </details>

      <details class="qa">
        <summary>「19/35 → 0/35」到底是什么指标？</summary>
        <div class="qa-body">
          <p>是域门控的误拒答率，不是事实错误率。也就是 35 道本该能回答的问题里，
             有 19 道被错误地拒绝了，修完之后是 0 道。</p>
          <p>把它说成「事实错误」是错的——忠实度是断言级指标，没有这个分母。</p>
        </div>
      </details>

      <details class="qa">
        <summary>忠实度第三次为什么从 0.95 掉到 0.92？</summary>
        <div class="qa-body">
          <p>因为主动收紧了高风险断言的门控：宁可判得更严，也不放过可能改写分数位次的回答。
             用 2.7 个点的忠实度换更硬的事实约束，这个交换是有意做的，不是回退。</p>
        </div>
      </details>

      <details class="qa">
        <summary>为什么一定要强制引用？</summary>
        <div class="qa-body">
          <p>志愿填报答错的代价太高。没有出处的回答无法核对，也无法在出问题时定位是数据错、检索错还是生成错。
             强制引用把「信不信」变成「查不查得到」。</p>
        </div>
      </details>
    </section>

    <section class="project-section">
      <h3>结果</h3>
      <div class="dlg-metrics">
        <div><b>22.3 → 7.0s</b><span>提问到出字（-69%）</span></div>
        <div><b>19 → 0</b><span>误拒答（35 题中）</span></div>
        <div><b>+2.56 / +2.13</b><span>首位命中率 / 排序质量（pt）</span></div>
        <div><b>0.86 → 0.95 → 0.92</b><span>忠实度（末次主动收紧）</span></div>
        <div><b>1,416</b><span>自动化测试</span></div>
        <div><b>147</b><span>数据质量规则</span></div>
      </div>
      <p class="dlg-footnote">
        内部验收版本，未做公网部署。指标均为本地评测实测。
      </p>
    </section>

    <section class="project-section">
      <h3>技术栈</h3>
      <ul class="chips chips-lg">
        <li>Python</li><li>FastAPI</li><li>LangGraph</li><li>PostgreSQL</li><li>pgvector</li>
        <li>tsvector</li><li>RRF</li><li>jieba</li><li>SSE</li><li>pytest</li>
      </ul>
    </section>
</template>
