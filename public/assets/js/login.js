const $ = (selector) => document.querySelector(selector);

function showErr(message = "") {
  const element = $("#err");
  if (element) element.textContent = message;
}

function setLoading(isLoading) {
  const button = $("#login");
  if (!button) return;
  button.disabled = Boolean(isLoading);
  button.textContent = isLoading ? "Entrando..." : "Entrar";
}

function mapLoginError(message) {
  const text = String(message || "");
  if (text.includes("Invalid email or password")) return "Email ou senha invalidos.";
  if (text.includes("INIT_ADMIN_EMAIL/INIT_ADMIN_PASSWORD")) return "Credenciais iniciais nao configuradas no servidor.";
  return "Nao foi possivel entrar agora.";
}

async function doLogin() {
  showErr("");
  setLoading(true);

  const email = $("#email")?.value.trim();
  const password = $("#password")?.value || "";
  if (!email || !password) {
    showErr("Informe email e senha.");
    setLoading(false);
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    window.location.assign("/admin");
  } catch (error) {
    console.error(error);
    showErr(mapLoginError(error?.message));
  } finally {
    setLoading(false);
  }
}

function boot() {
  $("#login")?.addEventListener("click", doLogin);
  $("#email")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") doLogin();
  });
  $("#password")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") doLogin();
  });
  $("#togglePass")?.addEventListener("click", () => {
    const input = $("#password");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
}

boot();
