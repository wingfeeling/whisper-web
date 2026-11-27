// 背景執行緒：負責下載模型與辨識，避免畫面卡住
import { pipeline, env, WhisperTextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1';
env.allowLocalModels = false;
env.useBrowserCache = true; // 模型存在瀏覽器的 Cache Storage，第二次不用再下載

let asr = null, loadedKey = '', loading = null;

async function load(m) {
  const key = m.model + '|' + m.device + '|' + JSON.stringify(m.dtype);
  if (asr && loadedKey === key) return;
  if (asr) { try { await asr.dispose(); } catch {} asr = null; loadedKey = ''; }
  asr = await pipeline('automatic-speech-recognition', m.model, {
    device: m.device,
    dtype: m.dtype,
    progress_callback: (p) => self.postMessage({ type: 'progress', p }),
  });
  loadedKey = key;
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      loading = load(m);
      await loading;
      self.postMessage({ type: 'ready', device: m.device, model: m.model });
    }
    if (m.type === 'run') {
      if (loading) await loading;
      const opts = { task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: true };
      if (m.language !== 'auto') opts.language = m.language;
      try {
        let done = 0;
        opts.streamer = new WhisperTextStreamer(asr.tokenizer, {
          skip_prompt: true,
          callback_function: (t) => self.postMessage({ type: 'partial', text: t, part: m.part }),
          on_chunk_end: () => self.postMessage({ type: 'chunk', n: ++done, part: m.part }),
        });
      } catch {}
      const out = await asr(m.audio, opts);
      self.postMessage({ type: 'result', out, part: m.part });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err), part: m.part, phase: m.type });
  }
};
