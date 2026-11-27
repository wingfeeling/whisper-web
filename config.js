// ===== 網站設定（部署前只需要改這個檔案）=====

// 1) Firebase 設定：到 https://console.firebase.google.com 建立專案 → 新增網頁應用程式 → 複製設定貼在這裡。
//    還沒填之前，網站會以「訪客模式」運作（可以轉檔，但不能註冊登入）。
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};

// 2) 免費版／付費版限制
export const LIMITS = {
  free: { maxMinutes: 60, maxTermsPerList: 10, keepTranscripts: 3 },
  pro:  { maxMinutes: Infinity, maxTermsPerList: Infinity, keepTranscripts: Infinity },
};

// 3) 「升級付費版」按鈕要開的付款頁面（例如綠界、藍新、Stripe 的付款連結）。留空會顯示「即將推出」。
export const UPGRADE_URL = '';
