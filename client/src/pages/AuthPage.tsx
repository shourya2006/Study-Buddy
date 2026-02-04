import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock Authentication Logic
    // In a real app, this would verify credentials with the backend

    if (id && secret) {
      localStorage.setItem("isAuthenticated", "true");
      // Simulate processing delay for effect
      setTimeout(() => {
        navigate("/select-semester");
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="cursor-target absolute top-8 left-8 text-white/40 hover:text-white font-mono text-sm tracking-widest transition-colors z-20 flex items-center gap-2 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">
          &lt;&lt;
        </span>{" "}
        ABORT
      </button>

      {/* Auth Terminal Container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-8 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative group">
          {/* Header */}
          <div className="text-center mb-10 overflow-hidden">
            <h1 className="text-xl md:text-2xl tracking-[0.2em] font-bold mb-2 break-words">
              {isLogin ? "IDENTITY_VERIFICATION" : "NEW_RECRUIT_REG"}
            </h1>
            <p className="text-[10px] text-white/40 tracking-widest uppercase">
              Secure_Link::State_Active
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex mb-8 border border-white/10 p-1 bg-white/5">
            <button
              onClick={() => setIsLogin(true)}
              className={`cursor-target flex-1 py-2 text-xs tracking-widest transition-all ${
                isLogin
                  ? "bg-white text-black font-bold"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`cursor-target flex-1 py-2 text-xs tracking-widest transition-all ${
                !isLogin
                  ? "bg-white text-black font-bold"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="group/input relative">
              <label className="block text-[10px] text-green-500/70 mb-2 tracking-[0.2em] font-bold uppercase">
                {isLogin ? "Operative_ID" : "Choose_ID"}
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="cursor-target w-full bg-black/50 border border-white/20 text-white p-3 text-sm outline-none focus:border-green-500 transition-colors placeholder-white/20"
                placeholder="ENTER_ID..."
                autoFocus
              />
            </div>

            <div className="group/input relative">
              <label className="block text-[10px] text-green-500/70 mb-2 tracking-[0.2em] font-bold uppercase">
                {isLogin ? "Access_Secret" : "Set_Secret"}
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="cursor-target w-full bg-black/50 border border-white/20 text-white p-3 text-sm outline-none focus:border-green-500 transition-colors placeholder-white/20"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              className="cursor-target w-full bg-white text-black py-4 mt-4 font-bold tracking-[0.2em] hover:bg-green-500 hover:text-black transition-colors relative overflow-hidden group/btn"
            >
              <span className="relative z-10">
                {isLogin ? "AUTHENTICATE" : "INITIALIZE_PROFILE"} &gt;
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            </button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] text-white/30 tracking-widest">
                OR
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "https://google.com")} // Placeholder
              className="cursor-target w-full bg-white/5 border border-white/10 text-white py-3 font-bold tracking-[0.1em] hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex items-center justify-center gap-3 group/google"
            >
              {/* Simple Google Icon SVG Placeholder */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                  className="group-hover/google:fill-black"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                  className="group-hover/google:fill-black"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                  fill="#FBBC05"
                  className="group-hover/google:fill-black"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                  className="group-hover/google:fill-black"
                />
              </svg>
              CONTINUE_WITH_GOOGLE
            </button>
          </form>

          {/* Decorative Elements */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-white pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-white pointer-events-none" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-white pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-white pointer-events-none" />
        </div>

        <div className="mt-8 text-center text-[10px] text-white/20">
          <p>SYSTEM_ID: CRYPTO-992-ALPHA</p>
          <p>UNAUTHORIZED ACCESS STRICTLY PROHIBITED</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
