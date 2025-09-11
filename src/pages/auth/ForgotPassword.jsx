import { useState } from "react";
import { Link } from "react-router-dom";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../stores/useAuthStore";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const requestReset = useAuthStore((s) => s.requestReset);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await requestReset({ email });
      setSuccessMsg(res.message);
      setSent(true);
    } catch (ex) {
      setErr(ex.message || "Gagal mengirim tautan reset");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md card">
        <div className="card-body space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Lupa Password</h1>
            <p className="text-sm text-gray-500">
              Masukkan email untuk menerima tautan reset.
            </p>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}
          {sent ? (
            <div className="text-sm text-green-600">{successMsg}</div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Button type="submit">Kirim Tautan Reset</Button>
            </form>
          )}

          <div className="text-sm">
            <Link to="/login" className="hover:underline">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
