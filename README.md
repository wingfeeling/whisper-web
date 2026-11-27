# 語音轉文字（瀏覽器 Whisper）v2

辨識在使用者自己的電腦裡執行，錄音、音檔、轉出來的文字都不會上傳。純靜態網頁，放 GitHub Pages 即可。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 主畫面 |
| `config.js` | **唯一需要改的設定**：Firebase、免費版限制、付款連結 |
| `auth.js` | 註冊／Email 登入／Google 登入、查詢付費方案 |
| `store.js` | 本機資料庫（轉錄紀錄、詞庫、未完成進度） |
| `vocab.js` | 自訂詞庫校正（同音字比對） |
| `worker.js` | 背景下載模型與辨識 |
| `firestore.rules` | Firestore 安全規則 |

## 部署
1. 把整個資料夾的檔案（含 `.nojekyll`）上傳到 GitHub repository。
2. Settings → Pages → Deploy from a branch → `main` / `(root)`。

## 開啟登入功能（Firebase，免費額度就夠用）
1. 到 https://console.firebase.google.com 建立專案。
2. 專案設定 → 一般 → 新增「網頁應用程式」，把 `apiKey / authDomain / projectId / appId` 貼到 `config.js`。
3. Authentication → Sign-in method：啟用「電子郵件/密碼」和「Google」。
4. Authentication → 設定 → 授權網域：加入 `你的帳號.github.io`（以及你自己的網域）。
5. Firestore Database → 建立資料庫 → 規則：貼上 `firestore.rules` 的內容並發布。

沒填 Firebase 設定時，網站以「訪客模式」運作，一樣可以轉檔。

## 把使用者設為付費版
Firestore → 集合 `users` → 文件 ID = 使用者的 UID（在 Authentication 列表可以看到）→ 欄位 `plan`（字串）= `pro`。
之後接金流時，由付款成功通知（webhook，例如 Firebase Cloud Functions）自動寫這個欄位即可。
`config.js` 的 `UPGRADE_URL` 填付款頁網址，按「升級」時會自動帶上 `uid` 與 `email` 參數，方便金流回傳時對應帳號。

## 免費版限制（可在 config.js 調整）
- 單一檔案最多 60 分鐘（超過可選「先轉前 60 分鐘」）
- 每個詞庫最多 10 個詞
- 只保留最近 3 筆紀錄，第 4 筆存入時自動刪除最舊的

## 注意
- 紀錄存在「這台電腦的這個瀏覽器」。換電腦、換瀏覽器或清除網站資料就看不到，請用「備份全部到檔案」。
- 長檔案每 10 分鐘存一次進度，當掉或關掉後選同一個檔案可以接著轉。

## 版權
© 2026 wingfeeling. All rights reserved.
