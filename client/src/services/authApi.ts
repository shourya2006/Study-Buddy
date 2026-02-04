const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string };
}

export const authApi = {
  async register(id: string, secret: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, secret }),
    });
    return response.json();
  },

  async login(id: string, secret: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, secret }),
    });
    return response.json();
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },

  async getProfile(): Promise<AuthResponse> {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "auth-token": token || "",
      },
    });
    return response.json();
  },

  saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("isAuthenticated", "true");
  },

  clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("isAuthenticated");
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
