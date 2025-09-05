import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [err, setErr] = useState({});

  function validate() {
    const e = {};
    if (!form.name) e.name = "Nama wajib diisi";
    if (!form.email) e.email = "Email wajib diisi";
    if (!form.password || form.password.length < 6) e.password = "Min 6 karakter";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register(form);
      nav("/login", { state: { registered: true, email: form.email } });
    } catch (ex) {
      setErr({ global: ex.message || "Gagal mendaftar" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md card">
        <div className="card-body space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Daftar</h1>
            <p className="text-sm text-gray-500">Buat akun baru</p>
          </div>

          {err.global && <div className="text-sm text-red-600">{err.global}</div>}

          <form className="space-y-4" onSubmit={submit}>
            <TextField label="Nama" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} error={err.name}/>
            <TextField label="Email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} error={err.email}/>
            <TextField label="Password" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} error={err.password}/>
            <Button type="submit">Daftar</Button>
          </form>

          <div className="text-sm">
            Sudah punya akun? <Link to="/login" className="hover:underline">Masuk</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
