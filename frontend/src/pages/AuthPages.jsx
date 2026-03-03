import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.full_name.split(" ")[0]}!`);
      navigate(user.role === "platform_admin" ? "/admin" : "/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Welcome back" subtitle="Sign in to your account">
    <form onSubmit={handle}>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="you@example.com"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="••••••••"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full"
        style={{ justifyContent: "center", padding: "14px", marginTop: 8 }}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
      <p style={{ textAlign: "center", marginTop: 20, color: "#6B7280", fontSize: 14 }}>
        Don't have an account? <Link to="/register" style={{ color: "#F4A900" }}>Sign up</Link>
      </p>
    </form>
  </AuthLayout>;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", role: "donor",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Create an account" subtitle="Start donating or register your charity">
    <form onSubmit={handle}>
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input className="form-input" placeholder="Your full name"
          value={form.full_name} onChange={set("full_name")} required />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="you@example.com"
          value={form.email} onChange={set("email")} required />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="Min 8 characters"
          value={form.password} onChange={set("password")} required minLength={8} />
      </div>
      <div className="form-group">
        <label className="form-label">I am a...</label>
        <select className="form-select" value={form.role} onChange={set("role")}>
          <option value="donor">Donor / Supporter</option>
          <option value="org_admin">Charity Organization</option>
        </select>
      </div>
      {form.role === "org_admin" && (
        <div style={{
          background: "rgba(244,169,0,0.08)", border: "1px solid rgba(244,169,0,0.2)",
          borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13, color: "#F4A900",
        }}>
          📋 After registration, you'll need to verify your organization with supporting documents.
        </div>
      )}
      <button type="submit" disabled={loading} className="btn btn-primary w-full"
        style={{ justifyContent: "center", padding: "14px", marginTop: 8 }}>
        {loading ? "Creating account..." : "Create Account"}
      </button>
      <p style={{ textAlign: "center", marginTop: 20, color: "#6B7280", fontSize: 14 }}>
        Already have an account? <Link to="/login" style={{ color: "#F4A900" }}>Sign in</Link>
      </p>
    </form>
  </AuthLayout>;
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: "calc(100vh - 64px)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "40px 24px",
      background: "radial-gradient(ellipse at 50% 0%, rgba(200,16,46,0.12) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>दान</div>
          </Link>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>{title}</h1>
          <p style={{ color: "#6B7280" }}>{subtitle}</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
