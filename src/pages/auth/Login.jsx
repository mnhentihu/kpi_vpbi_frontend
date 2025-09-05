import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const location = useLocation();
  const registered = location.state?.registered;
  const prefillEmail = location.state?.email ?? "";
  const nav = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({ email: prefillEmail, password: "" });
  const [err, setErr] = useState({});

  function validate() {
    const e = {};
    if (!form.email) e.email = "Email wajib diisi";
    if (!form.password) e.password = "Password wajib diisi";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(form);
      nav("/");
    } catch (ex) {
      setErr({ global: ex.message || "Gagal login" });
    }
  }

  async function loginGoogle() {
    try {
      await loginWithGoogle();
      nav("/");
    } catch {
      setErr({ global: "Gagal login Google. Coba lagi." });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md card">
        <div className="card-body space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Masuk</h1>
            <p className="text-sm text-gray-500">KPI cmlabs</p>
          </div>

          {registered && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              Pendaftaran berhasil. Silakan login dengan akun yang baru dibuat.
            </div>
          )}
          {err.global && <div className="text-sm text-red-600">{err.global}</div>}

          <form className="space-y-4" onSubmit={submit}>
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={(e)=>setForm({...form, email:e.target.value})}
              placeholder="you@example.com"
              error={err.email}
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              value={form.password}
              onChange={(e)=>setForm({...form, password:e.target.value})}
              placeholder="••••••••"
              error={err.password}
            />
            <Button type="submit">Masuk</Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-200 w-full"></div>
            <span className="text-xs text-gray-400">atau</span>
            <div className="h-px bg-gray-200 w-full"></div>
          </div>

          <button
            onClick={loginGoogle}
            className="w-full border rounded-xl px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <FcGoogle size={18} />
            <span>Masuk dengan Google</span>
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link to="/register" className="text-gray-700 hover:underline">Buat akun</Link>
            <Link to="/forgot-password" className="text-gray-700 hover:underline">Lupa password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
