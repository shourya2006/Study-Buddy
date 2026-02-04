import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../services/authApi";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();

  if (!authApi.isAuthenticated()) {
    // Redirect to auth page, saving the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
