// Mock auth pakai localStorage. Nanti mudah diganti API beneran.
const KEY = "kpi-auth";

export function getSession() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function login({ email, password }) {
  if (!email || !password) throw new Error("Email dan password wajib diisi");
  // anggap sukses
  const user = { email, name: email.split("@")[0] };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function register({ name, email, password }) {
  if (!name || !email || !password) throw new Error("Lengkapi semua field");
  // sukses TANPA auto-login
  return { success: true };
}

export function requestReset({ email }) {
  if (!email) throw new Error("Email wajib diisi");
  // real-world: kirim email reset
  return true;
}

export function logout() {
  localStorage.removeItem(KEY);
}
