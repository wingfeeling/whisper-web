# 語音轉文字（瀏覽器 Whisper）

Whisper 模型直接在瀏覽器裡執行，錄音與檔案不會上傳。純靜態網頁，可放在 GitHub Pages。

## 部署到 GitHub Pages
1. 到 GitHub 建立新的 repository（例如 `whisper-web`），設為 Public。
2. 按 **Add file → Upload files**，把 `index.html`、`.nojekyll`、`README.md` 拖進去，按 **Commit changes**。
3. 到 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，按 Save。
4. 等 1～2 分鐘，網址會是 `https://你的帳號.github.io/whisper-web/`。

## 說明
- 模型從 Hugging Face 免費載入，第一次下載後會存在瀏覽器裡。
- 有 GPU 加速（WebGPU，新版 Chrome / Edge）會快很多，並自動預設最準的 Large v3 Turbo。
- 錄音功能需要 https 網址（GitHub Pages 已經是 https）。

## 版權
© 2026 wingfeeling. All rights reserved.
