import {
    Routes,
    Route,
    NavLink,
    Navigate,
    useNavigate,
    useLocation
  } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

  
export const ProtectedRoute = ({ children }: any) => {
    const { token }: any = useAuth();
    const location = useLocation();

    if (!token) {
        console.log(`ProtectedRoute. from: ${location.pathname}`)
        return <Navigate to="/auth" replace />;
    }

    return children;
};