import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../services/authApi";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error) {
      navigate("/auth?error=" + error);
      return;
    }

    if (accessToken && refreshToken) {
      authApi.saveTokens(accessToken, refreshToken);
      navigate("/select-semester", { replace: true });
    } else {
      navigate("/auth?error=missing_tokens");
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl tracking-widest mb-4 animate-pulse">
          AUTHENTICATING...
        </div>
        <div className="text-xs text-white/40 tracking-[0.3em]">
          PROCESSING CREDENTIALS
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
