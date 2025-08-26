import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const $ = (s) => document.querySelector(s);
const showErr = (m="") => { const el=$("#err"); if (el) el.textContent=m; };
const setLoading = (v) => { const b=$("#login"); if (b){ b.disabled=!!v; b.textContent = v ? "Entrando..." : "Entrar"; } };

async function loadFirebaseConfig(){
  const r = await fetch("/firebase_config.json", { credentials:"same-origin" });
  if (!r.ok) throw new Error("firebase_config.json não encontrado");
  return r.json();
}
function mapFirebaseError(code){
  const m = String(code || "");
  if (m.includes("auth/invalid-credential") || m.includes("auth/invalid-login-credentials")) return "Credenciais inválidas.";
  if (m.includes("auth/user-not-found")) return "Usuário não encontrado.";
  if (m.includes("auth/wrong-password")) return "Senha incorreta.";
  if (m.includes("auth/too-many-requests")) return "Muitas tentativas. Tente novamente em instantes.";
  if (m.includes("auth/network-request-failed")) return "Falha de rede. Verifique sua conexão.";
  if (m.includes("api-key-not-valid")) return "Chave de API inválida. Verifique a configuração do Firebase.";
  return "Não foi possível entrar. Verifique as credenciais.";
}

(async function boot(){
  try{
    const cfg = await loadFirebaseConfig();
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
      if (user && document.visibilityState !== "hidden") {
      }
    });

    async function doLogin(){
      showErr(""); setLoading(true);
      const email = $("#email")?.value.trim();
      const password = $("#password")?.value || "";
      if (!email || !password){ showErr("Informe email e senha."); setLoading(false); return; }
      try{
        const creds = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await creds.user.getIdToken(true);
        const res = await fetch("/api/auth/session", {
          method:"POST",
          credentials:"same-origin",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ idToken })
        });
        if (!res.ok){
          const t = await res.text();
          throw new Error(t || `Falha ao criar sessão (HTTP ${res.status})`);
        }
        window.location.assign("/admin");
      }catch(err){
        console.error(err);
        showErr(mapFirebaseError(err?.code || err?.message));
      }finally{
        setLoading(false);
      }
    }
    $("#login")?.addEventListener("click", doLogin);
    $("#email")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
    $("#password")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
    $("#togglePass")?.addEventListener("click", () => {
      const i=$("#password");
      if (!i) return;
      i.type = i.type === "password" ? "text" : "password";
    });

  }catch(e){
    console.error(e);
    showErr("Falha ao carregar configuração do Firebase.");
  }
})();

(() => {
  const style = 'color:#6f42c1;font-weight:700;font-size:14px';
  console.log('%cEasyMakers 🦉', style);
})();