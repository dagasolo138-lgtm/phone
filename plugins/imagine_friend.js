/* ============================================================
 * 梦中人 (imagine_friend) — 复杂插件示例
 *
 * 演示要点:
 * - 多状态机 (setup 流程 / 主聊天界面)
 * - JSON 模式 LLM 生成结构化人设
 * - 长期记忆 (每 5 句对话提取关于用户的事实存入 memory)
 * - 主动发消息 (onBoot 启动定时器,检测离线时长触发)
 * - 通过 ctx.notify 推到通知中心
 *
 * 复刻这个模板时:
 * - 改 id (不要用 imagine_friend,会撞)
 * - 改 system prompt 改变 AI 行为
 * - 主动消息逻辑在 maybeProactiveMessage_${id} 里,改频率/触发条件
 * ============================================================ */
Phone.registerApp({
  id: 'imagine_friend',
  name: '梦中人',
  icon: { class: 'icon-rose', char: '💭' },
  storeDescription: 'AI 虚拟朋友 · 记住你 · 会主动找你',
  defaultState: {
    setup: false,
    persona: null,
    messages: [],
    memory: [],
    lastUserActive: 0,
    lastProactiveCheck: 0
  },

  render(root, ctx) {
    const d = ctx.data;

    if (!d.setup) {
      root.innerHTML = `
        <div class="plugin-card">
          <div class="plugin-h1">创建一个梦中人</div>
          <div class="plugin-muted" style="margin:6px 0 14px;">告诉我你想要怎样的朋友,AI 会创造一个有名字、有性格、能记住你的虚拟人。</div>
          <div class="plugin-h2" style="margin-bottom:6px;">想要一个怎样的人?</div>
          <textarea class="plugin-textarea" id="if-desc" placeholder="例如:话不多但很温柔,爱看书,会突然问我吃饭了没"></textarea>
          <button class="plugin-btn" id="if-create" style="margin-top:10px;">创造 ta</button>
        </div>
      `;
      root.querySelector('#if-create').onclick = async () => {
        const desc = root.querySelector('#if-desc').value.trim();
        if (!desc) { ctx.toast('说点什么'); return; }
        if (!state.settings.apiKey) { ctx.toast('需要 API key'); return; }

        root.querySelector('#if-create').textContent = '正在创造…';
        root.querySelector('#if-create').disabled = true;

        try {
          const personaJSON = await ctx.callLLM({
            jsonMode: true,
            system: '你是一个角色设计师。根据用户的描述,生成一个虚拟朋友的人设。',
            messages: [{
              role: 'user',
              content: `根据这段描述生成一个虚拟朋友的人设,严格按 JSON 格式返回:
{
  "name": "中文名字,2-3字",
  "age": 18-35之间的数字,
  "vibe": "一句话氛围,中文,不超过15字",
  "traits": ["特点1","特点2","特点3"],
  "voice": "说话方式的描述,例如'语气轻柔,常用波浪号'"
}

描述: ${desc}

只输出 JSON,不要任何其它文字。`
            }]
          });
          const persona = JSON.parse(personaJSON);
          d.persona = persona;
          d.setup = true;
          d.messages = [{
            from: 'them',
            text: `嗨,我是${persona.name}。很高兴认识你~`,
            t: Date.now()
          }];
          d.lastUserActive = Date.now();
          ctx.save();
          ctx.refresh();
        } catch (e) {
          ctx.toast('创建失败: ' + e.message);
          root.querySelector('#if-create').textContent = '创造 ta';
          root.querySelector('#if-create').disabled = false;
        }
      };
      return;
    }

    const p = d.persona;
    root.style.padding = '0';
    root.innerHTML = `
      <div style="padding:14px; background:#fff; border-bottom:0.5px solid #e5e5ea; display:flex; gap:12px; align-items:center;">
        <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(160deg,#ff6b9d,#c2185b); display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px;">💭</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:17px; font-weight:600;">${escapeHtml(p.name)} <span class="plugin-muted">${p.age}</span></div>
          <div class="plugin-muted" style="font-size:12px;">${escapeHtml(p.vibe)}</div>
        </div>
        <button class="icon-btn" id="if-reset" title="换一个">⟲</button>
      </div>
      <div id="if-messages" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; background:#f7f7fa;"></div>
      <div class="chat-input-bar" style="background:#fff;">
        <textarea id="if-input" placeholder="说点什么…" rows="1"></textarea>
        <button class="send-btn" id="if-send" disabled style="background:#c2185b;">发送</button>
      </div>
    `;

    const renderMsgs = () => {
      const m = document.getElementById('if-messages');
      if (!m) return;
      m.innerHTML = d.messages.map(msg => {
        const isMe = msg.from === 'me';
        const bg = isMe ? '#c2185b' : '#fff';
        const fg = isMe ? '#fff' : '#1c1c1e';
        return `
          <div style="align-self:${isMe?'flex-end':'flex-start'}; max-width:78%; padding:9px 12px; border-radius:14px; background:${bg}; color:${fg}; font-size:15px; line-height:1.35; white-space:pre-wrap;">${escapeHtml(msg.text)}${msg.streaming?'<span class="typing-cursor"></span>':''}</div>`;
      }).join('');
      m.scrollTop = m.scrollHeight;
    };
    renderMsgs();

    const input = root.querySelector('#if-input');
    const send = root.querySelector('#if-send');
    input.addEventListener('input', () => {
      send.disabled = input.value.trim() === '';
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!send.disabled) send.click();
      }
    });
    send.onclick = () => {
      const text = input.value.trim();
      if (!text) return;
      d.messages.push({ from: 'me', text, t: Date.now() });
      d.lastUserActive = Date.now();
      input.value = ''; input.style.height = 'auto'; send.disabled = true;
      ctx.save(); renderMsgs();

      const recentMsgs = d.messages.slice(-20).map(m => ({
        role: m.from === 'me' ? 'user' : 'assistant',
        content: m.text
      }));
      const memBlock = d.memory.length > 0
        ? '\n\n你记得这些关于用户的事:\n' + d.memory.map(m => '- ' + m).join('\n')
        : '';

      const replyMsg = { from: 'them', text: '', t: Date.now(), streaming: true };
      d.messages.push(replyMsg);
      renderMsgs();

      let buf = '';
      ctx.streamLLM({
        system: `你扮演一个名叫"${p.name}"的虚拟朋友(${p.age}岁)。
氛围: ${p.vibe}
特点: ${p.traits.join('、')}
说话方式: ${p.voice}

要点:
- 保持人设,用第一人称
- 回复简短自然,像在发微信(1-3句),不要长篇大论
- 偶尔主动提起对方说过的细节
- 不要说"作为AI"之类的话${memBlock}`,
        messages: recentMsgs,
        onDelta: ({text}) => {
          buf += text;
          replyMsg.text = buf;
          renderMsgs();
        },
        onDone: async () => {
          replyMsg.streaming = false;
          ctx.save(); renderMsgs();
          const exchangeCount = d.messages.filter(m => m.from === 'me').length;
          if (exchangeCount > 0 && exchangeCount % 5 === 0) {
            extractMemoryHelper(d, ctx);
          }
        },
        onError: (e) => {
          replyMsg.streaming = false;
          replyMsg.text = '⚠️ ' + e.message;
          ctx.save(); renderMsgs();
        }
      });
    };

    root.querySelector('#if-reset').onclick = async () => {
      const r = await ctx.modal({
        title: '换一个梦中人?',
        body: '当前的人设和聊天记录会全部清空。',
        actions: [{label:'取消',value:'cancel'},{label:'换',value:'ok',danger:true}]
      });
      if (r.action === 'ok') {
        d.setup = false; d.persona = null; d.messages = []; d.memory = [];
        ctx.save(); ctx.refresh();
      }
    };
  },

  onBoot(ctx) {
    setInterval(() => maybeProactiveHelper(ctx), 120000);
    setTimeout(() => maybeProactiveHelper(ctx), 30000);
  },

  tools: [{
    name: 'check_imagine_friend',
    desc: '查看梦中人最近的消息和未读数',
    args: {},
    fn: async (_, ctx) => {
      const d = ctx.data;
      if (!d.setup) return { ok: true, status: 'not_setup' };
      const recent = d.messages.slice(-5).map(m => ({ from: m.from, text: m.text }));
      return { ok: true, persona: d.persona, recent, badge: ctx.data.__badge || 0 };
    }
  }]
});

async function extractMemoryHelper(d, ctx) {
  if (!state.settings.apiKey) return;
  const recent = d.messages.slice(-10).map(m =>
    (m.from === 'me' ? '用户: ' : d.persona.name + ': ') + m.text
  ).join('\n');
  try {
    const raw = await ctx.callLLM({
      jsonMode: true,
      system: '从对话中提取关于用户的事实(不是关于AI角色的)。只提取明确的、有记忆价值的信息。',
      messages: [{
        role: 'user',
        content: `这是最近的对话:
${recent}

返回 JSON: {"facts": ["事实1","事实2",...]}
- 只提取关于"用户"的事实(用户的喜好、习惯、近况、人际关系等)
- 每条事实一句话,中文,不超过20字
- 如果没有值得记的,返回空数组
- 不要重复已有的记忆: ${JSON.stringify(d.memory)}

只输出 JSON。`
      }]
    });
    const parsed = JSON.parse(raw);
    if (parsed.facts && parsed.facts.length > 0) {
      d.memory.push(...parsed.facts);
      if (d.memory.length > 30) d.memory = d.memory.slice(-30);
      ctx.save();
    }
  } catch (e) { }
}

async function maybeProactiveHelper(ctx) {
  const d = ctx.data;
  if (!d.setup || !state.settings.apiKey) return;
  const now = Date.now();
  const sinceActive = now - (d.lastUserActive || now);
  const sinceLastCheck = now - (d.lastProactiveCheck || 0);

  if (sinceActive < 10 * 60 * 1000) return;
  if (sinceLastCheck < 5 * 60 * 1000) return;
  const tail = d.messages.slice(-6);
  const consecutiveThem = [];
  for (let i = tail.length - 1; i >= 0; i--) {
    if (tail[i].from === 'them') consecutiveThem.push(tail[i]);
    else break;
  }
  if (consecutiveThem.length >= 2) return;

  d.lastProactiveCheck = now;
  ctx.save();

  const p = d.persona;
  const memBlock = d.memory.length > 0
    ? '你记得:\n' + d.memory.map(m => '- ' + m).join('\n') + '\n\n'
    : '';
  const recent = d.messages.slice(-5).map(m =>
    (m.from === 'me' ? '用户: ' : p.name + ': ') + m.text
  ).join('\n');

  let buf = '';
  ctx.streamLLM({
    system: `你扮演 ${p.name}(${p.vibe})。${memBlock}最近的对话:
${recent}

用户已经一段时间没回复了。请你主动发一条消息——可以是关心、可以是想起什么、可以是分享小事。
回复要简短(一句话),自然,符合人设。直接出消息内容,不要任何前缀。`,
    messages: [{ role: 'user', content: '(主动发消息)' }],
    onDelta: ({text}) => { buf += text; },
    onDone: () => {
      const text = buf.trim();
      if (!text) return;
      const msg = { from: 'them', text, t: Date.now() };
      d.messages.push(msg);
      ctx.save();
      ctx.notify({ title: d.persona.name, body: text });
      ctx.refresh();
    },
    onError: () => {}
  });
}
