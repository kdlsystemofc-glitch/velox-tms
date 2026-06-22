import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Permite acesso a admin e operador; motorista vai p/ app; pendente p/ sem-acesso.
export default function OperatorRoute() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  const role = user?.role;
  if (role === "admin" || role === "operator" || role === "operador") return <Outlet />;
  if (role === "motorista") return <Navigate to="/motorista" replace />;
  return <Navigate to="/sem-acesso" replace />;
}