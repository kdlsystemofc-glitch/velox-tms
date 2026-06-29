import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Portal do Cliente: só papel "client" (aprovado pelo admin). Pendentes/sem
// vínculo caem em /sem-acesso (aguardando aprovação).
export default function ClientRoute() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "client") return <Outlet />;
  if (user.role === "motorista") return <Navigate to="/motorista" replace />;
  if (user.role === "admin" || user.role === "operator") return <Navigate to="/admin" replace />;
  return <Navigate to="/sem-acesso" replace />;
}
