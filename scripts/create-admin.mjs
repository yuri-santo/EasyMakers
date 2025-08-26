import { auth } from "../src/config/firebaseAdmin.js";

async function main() {
  const email = process.env.INIT_ADMIN_EMAIL;
  const password = process.env.INIT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Defina INIT_ADMIN_EMAIL e INIT_ADMIN_PASSWORD.");
    process.exit(1);
  }
  let user;
  try { user = await auth.getUserByEmail(email); } catch { /* não existe */ }
  if (user) {
    console.log("Usuário já existe:", email, user.uid);
    return;
  }

  const u = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: "Admin",
  });
  
  await auth.setCustomUserClaims(u.uid, { role: "admin" });

  console.log("Usuário criado:", email, u.uid);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
