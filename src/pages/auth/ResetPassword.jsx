import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../stores/useAuthStore";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await resetPassword({ token, password });
      setSuccess(res.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (ex) {
      setErr(ex.message || "Gagal reset password");
    }

    console.log("Token dari URL:", token);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md card">
        <div className="card-body space-y-5">
          <h1 className="text-2xl font-bold">Reset Password</h1>

          {err && <div className="text-sm text-red-600">{err}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          {!success && (
            <form className="space-y-4" onSubmit={submit}>
              <TextField
                label="Password Baru"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit">Ubah Password</Button>
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
