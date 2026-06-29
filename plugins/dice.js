/* ============================================================
 * 掷骰子 (dice) — 最简插件模板
 *
 * 演示要点:
 * - 最小可行 manifest (id + name + icon + render)
 * - ctx.data 存数据,ctx.save() 落盘,ctx.refresh() 重渲染
 * - 一个简单工具,让 agent 也能掷骰子
 *
 * 复刻这个模板时:
 * - 改 id 为你自己的(不要用 dice,会跟内置的撞)
 * - 改 name / icon / storeDescription
 * ============================================================ */
Phone.registerApp({
  id: 'dice',
  name: '掷骰子',
  icon: { class: 'icon-amber', char: '🎲' },
  storeDescription: '最简插件示例 · 看代码学怎么写',
  defaultState: { lastRoll: null, history: [] },

  render(root, ctx) {
    const d = ctx.data;
    root.innerHTML = `
      <div class="plugin-card" style="text-align:center;">
        <div style="font-size:88px;">${d.lastRoll || '🎲'}</div>
        <button class="plugin-btn" id="dice-roll">掷一次</button>
      </div>
      ${d.history.length > 0 ? `
        <div class="plugin-card">
          <div class="plugin-h2">历史</div>
          <div class="plugin-muted">最近 ${d.history.length} 次: ${d.history.slice(-10).join(' · ')}</div>
        </div>` : ''}
    `;
    root.querySelector('#dice-roll').onclick = () => {
      const r = Math.floor(Math.random() * 6) + 1;
      d.lastRoll = ['⚀','⚁','⚂','⚃','⚄','⚅'][r-1];
      d.history.push(r);
      ctx.save(); ctx.refresh();
    };
  },

  tools: [{
    name: 'roll_dice',
    desc: '掷一颗六面骰子,返回 1-6 的数字',
    args: { sides: 'number?' },
    fn: async ({ sides }, ctx) => {
      const n = sides || 6;
      const r = Math.floor(Math.random() * n) + 1;
      ctx.data.lastRoll = r <= 6 ? ['⚀','⚁','⚂','⚃','⚄','⚅'][r-1] : r.toString();
      ctx.data.history.push(r);
      ctx.save(); ctx.refresh();
      return { ok: true, result: r };
    }
  }]
});
