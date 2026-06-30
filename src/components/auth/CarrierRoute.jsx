import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Portal da Transportadora: só papel "carrier" (aprovado pelo admin). Demais
// papéis são redirecionados ao seu próprio espaço; pendentes vão a /sem-acesso.
export default function CarrierRoute() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "carrier") return <Outlet />;
  if (user.role === "client") return <Navigate to="/portal" replace />;
  if (user.role === "motorista") return <Navigate to="/motorista" replace />;
  if (user.role === "admin" || user.role === "operator") return <Navigate to="/admin" replace />;
  return <Navigate to="/sem-acesso" replace />;
}
