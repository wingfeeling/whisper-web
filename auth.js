// 帳號登入（Firebase Authentication）＋ 付費方案查詢（Firestore users/{uid}.plan）
// 只有 Email 和方案狀態會經過 Firebase；音檔與文字一律不上傳。
import { firebaseConfig } from './config.js';

const V = '10.12.2';
let auth = null, db = null, F = null;

export const configured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

export async function init(onChange) {
  if (!configured) { onChange(null, 'free'); return; }
  const [app, a, fs] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  F = { ...a, ...fs };
  const fb = app.initializeApp(firebaseConfig);
  auth = a.getAuth(fb);
  auth.languageCode = 'zh-TW';
  db = fs.getFirestore(fb);
  a.onAuthStateChanged(auth, async (user) => {
    if (!user) return onChange(null, 'free');
    onChange(user, await getPlan(user));
  });
}

async function getPlan(user) {
  try {
    const snap = await F.getDoc(F.doc(db, 'users', user.uid));
    const d = snap.exists() ? snap.data() : null;
    if (!d) return 'free';
    // plan: 'pro' 代表永久付費；也可以用 proUntil（時間戳）做訂閱制
    if (d.plan === 'pro') return 'pro';
    if (d.proUntil && d.proUntil.toMillis && d.proUntil.toMillis() > Date.now()) return 'pro';
    return 'free';
  } catch { return 'free'; }
}

export async function refreshPlan() {
  return auth && auth.currentUser ? getPlan(auth.currentUser) : 'free';
}

export async function google() {
  const p = new F.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try { await F.signInWithPopup(auth, p); }
  catch (e) {
    // 有些手機瀏覽器擋彈出視窗，改用整頁跳轉
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await F.signInWithRedirect(auth, p);
    } else throw e;
  }
}
export async function register(email, pw) {
  const c = await F.createUserWithEmailAndPassword(auth, email, pw);
  try { await F.sendEmailVerification(c.user); } catch {}
}
export const login = (email, pw) => F.signInWithEmailAndPassword(auth, email, pw);
export const resetPw = (email) => F.sendPasswordResetEmail(auth, email);
export const logout = () => F.signOut(auth);

export function errText(e) {
  const m = {
    'auth/invalid-email': 'Email 格式不對',
    'auth/missing-password': '請輸入密碼',
    'auth/weak-password': '密碼至少要 6 個字元',
    'auth/email-already-in-use': '這個 Email 已經註冊過了，請直接登入',
    'auth/invalid-credential': 'Email 或密碼錯誤',
    'auth/wrong-password': 'Email 或密碼錯誤',
    'auth/user-not-found': '找不到這個帳號，請先註冊',
    'auth/too-many-requests': '嘗試太多次了，請稍後再試',
    'auth/popup-closed-by-user': '登入視窗被關掉了',
    'auth/unauthorized-domain': '這個網址還沒加到 Firebase 的授權網域',
    'auth/network-request-failed': '網路連線失敗',
  };
  return m[e && e.code] || ((e && e.message) || '發生錯誤');
}
