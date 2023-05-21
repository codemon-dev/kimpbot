import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../App"
import { fakeAuth } from "../services/fakeAuth"

export const AuthProvider = ({ children }: any) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = React.useState<any>(null);
  
    const handleLogin = async () => {
      console.log("handleLogin");
      const token = await fakeAuth();
      setToken(token);
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin);
    };
  
    const handleLogout = () => {
      console.log("handleLogout");
      setToken(null);
    };
  
    const value: any = {
      token,
      onLogin: handleLogin,
      onLogout: handleLogout,
    };
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  };