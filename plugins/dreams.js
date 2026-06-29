/* ============================================================
 * 梦境 (dreams) — LLM 流式生成 + 持久化档案
 *
 * 演示要点:
 * - ctx.streamLLM 流式调用 LLM,边收边渲染
 * - 用户输入 → API key 检查 → 流式生成 → 写入 entries 数组
 * - 列表渲染 (按时间倒序)
 *
 * 复刻这个模板时:
 * - 改 id 为你自己的(不要用 dreams,会跟内置的撞)
 * - 改 system prompt 改变 AI 行为
 * - 改 defaultState.entries 的结构存别的东西
 * ============================================================ */
Phone.registerApp({
  id: 'dreams',
  name: '梦境',
  icon: { class: 'icon-indigo', char: '🌙' },
  storeDescription: 'AI 帮你记录超现实梦境',
  defaultState: { entries: [] /* [{id, date, prompt, dream}] */ },

  render(root, ctx) {
    const d = ctx.data;
    root.innerHTML = `
      <div class="plugin-card">
        <div class="plugin-h2">今晚做个梦</div>
        <div class="plugin-muted" style="margin:6px 0 10px;">说几个词,AI 给你编一段超现实的梦。</div>
        <input class="plugin-input" id="dream-prompt" placeholder="例如:大海、考试、奶奶">
        <button class="plugin-btn" id="dream-go" style="margin-top:10px;">生成</button>
      </div>
      <div id="dream-current"></div>
      ${d.entries.length > 0 ? `
        <div class="plugin-h2">梦境档案</div>
        ${d.entries.slice().reverse().map(e => `
          <div class="plugin-card">
            <div class="plugin-muted">${formatDate(e.date)} · ${escapeHtml(e.prompt)}</div>
            <div style="margin-top:6px; line-height:1.5; white-space:pre-wrap;">${escapeHtml(e.dream)}</div>
          </div>
        `).join('')}
      ` : ''}
    `;
    root.querySelector('#dream-go').onclick = async () => {
      const prompt = root.querySelector('#dream-prompt').value.trim();
      if (!prompt) { ctx.toast('先说几个词'); return; }
      if (!state.settings.apiKey) { ctx.toast('需要 API key,去设置填'); return; }

      const cur = document.getElementById('dream-current');
      cur.innerHTML = `<div class="plugin-card"><div class="plugin-muted">梦境生成中…</div><div id="dream-stream" style="margin-top:6px; line-height:1.5; white-space:pre-wrap;"></div></div>`;
      const target = document.getElementById('dream-stream');
      let buf = '';

      ctx.streamLLM({
        system: '你是一个梦境编织者。根据用户提供的关键词,写一段 100-200 字的超现实主义梦境片段。要诡异、迷离、有意象,不要解释。直接出梦。',
        messages: [{ role: 'user', content: '关键词: ' + prompt }],
        onDelta: ({text}) => { buf += text; target.textContent = buf; },
        onDone: () => {
          d.entries.push({ id: 'dr_' + Date.now(), date: Date.now(), prompt, dream: buf });
          ctx.save(); ctx.refresh();
        },
        onError: (e) => { target.textContent = '⚠️ ' + e.message; }
      });
    };
  },

  tools: [{
    name: 'list_dreams',
    desc: '列出所有梦境记录',
    args: {},
    fn: async (_, ctx) => ({
      ok: true,
      dreams: ctx.data.entries.map(e => ({
        date: new Date(e.date).toISOString().slice(0,10),
        prompt: e.prompt,
        preview: e.dream.slice(0, 60)
      }))
    })
  }]
});
