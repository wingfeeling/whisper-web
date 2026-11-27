// 自訂詞庫校正：用「拼音相同／相近」把辨識錯的同音字換成詞庫裡的正確名詞。
// 全部在瀏覽器裡算，不會送出任何文字。
// 需要先載入 pinyin-pro（全域 pinyinPro），沒有的話只做「別名 → 正確詞」與英文大小寫校正。

const HAN = /[㐀-鿿豈-﫿]/;

// 台灣口音常混的音：zh/z、ch/c、sh/s、n/l、in/ing、en/eng、an/ang、f/h（只在 fuzzy 模式）
function norm(py, fuzzy) {
  if (!fuzzy) return py;
  return py
    .replace(/^zh/, 'z').replace(/^ch/, 'c').replace(/^sh/, 's')
    .replace(/^n(?=[^g]|$)/, 'l')
    .replace(/^f/, 'h')
    .replace(/ing$/, 'in').replace(/eng$/, 'en').replace(/ang$/, 'an');
}

const charCache = new Map();
function readings(ch) {
  // 一個字所有可能的讀音（多音字全部列出），避免「長輩」被讀成 chang 就對不上
  let r = charCache.get(ch);
  if (r) return r;
  r = new Set();
  const P = globalThis.pinyinPro;
  if (P && HAN.test(ch)) {
    try {
      const all = P.pinyin(ch, { toneType: 'none', multiple: true, type: 'array' });
      all.forEach((x) => r.add(x));
    } catch {}
  }
  charCache.set(ch, r);
  return r;
}

function termPinyin(term) {
  const P = globalThis.pinyinPro;
  if (!P) return null;
  return P.pinyin(term, { toneType: 'none', type: 'array' });
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * 把詞庫整理成可用的規則。
 * entries: [{ term: '王小明', aliases: ['王曉明','汪小明'] }, ...]
 */
export function compile(entries) {
  return (entries || [])
    .map((e) => ({
      term: (e.term || '').trim(),
      aliases: (e.aliases || []).map((a) => a.trim()).filter(Boolean),
    }))
    .filter((e) => e.term)
    .map((e) => {
      const chars = [...e.term];
      const han = chars.every((c) => HAN.test(c));
      return { ...e, chars, han, py: han ? termPinyin(e.term) : null };
    })
    // 長的詞先處理，避免短詞把長詞切壞
    .sort((a, b) => b.chars.length - a.chars.length);
}

/** 校正一段文字，回傳 { text, hits }，hits 記錄改了哪些地方 */
export function correct(text, rules) {
  if (!text || !rules || !rules.length) return { text, hits: [] };
  const hits = [];
  let out = text;

  for (const r of rules) {
    // 1) 使用者自己寫的「常被聽成」→ 直接換
    for (const a of r.aliases) {
      if (a === r.term) continue;
      const re = new RegExp(escapeRe(a), 'gi');
      out = out.replace(re, (m) => { hits.push({ from: m, to: r.term }); return r.term; });
    }

    // 2) 英文／數字名詞：大小寫、空白、連字號不同都校正（例如 chat gpt → ChatGPT）
    if (!r.han && /[a-z]/i.test(r.term)) {
      const loose = [...r.term.replace(/[\s\-_.]/g, '')].map(escapeRe).join('[\\s\\-_.]?');
      const re = new RegExp('(?<![A-Za-z])' + loose + '(?![A-Za-z])', 'gi');
      out = out.replace(re, (m) => { if (m !== r.term) hits.push({ from: m, to: r.term }); return r.term; });
      continue;
    }

    // 3) 中文名詞：拼音比對同音字
    if (!r.han || !r.py || r.chars.length < 2) continue;
    const n = r.chars.length;
    const fuzzy = n >= 3; // 兩個字的詞太短，只接受完全同音，避免亂換
    const want = r.py.map((p) => norm(p, fuzzy));
    const arr = [...out];
    let changed = false;
    for (let i = 0; i + n <= arr.length; i++) {
      let ok = true, same = true;
      for (let k = 0; k < n; k++) {
        const c = arr[i + k];
        if (c !== r.chars[k]) same = false;
        if (c === r.chars[k]) continue;
        const rs = readings(c);
        let m = false;
        for (const p of rs) if (norm(p, fuzzy) === want[k]) { m = true; break; }
        if (!m) { ok = false; break; }
      }
      if (ok && !same) {
        // 至少要有一個字本來就對，或詞長 >= 3，才換（降低誤換機率）
        const anyExact = r.chars.some((ch, k) => arr[i + k] === ch);
        if (anyExact || n >= 3) {
          hits.push({ from: arr.slice(i, i + n).join(''), to: r.term });
          for (let k = 0; k < n; k++) arr[i + k] = r.chars[k];
          changed = true;
          i += n - 1;
        }
      }
    }
    if (changed) out = arr.join('');
  }
  return { text: out, hits };
}

/** 文字框內容 → 詞條。每行一個詞；可寫「正確詞 = 錯字1, 錯字2」 */
export function parseLines(src) {
  return (src || '').split(/\n/).map((line) => {
    const [term, rest] = line.split(/[=＝]/);
    return {
      term: (term || '').trim(),
      aliases: (rest || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
    };
  }).filter((e) => e.term);
}

export function toLines(entries) {
  return (entries || []).map((e) => e.term + (e.aliases && e.aliases.length ? ' = ' + e.aliases.join(', ') : '')).join('\n');
}
