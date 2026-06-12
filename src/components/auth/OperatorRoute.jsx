import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Permite acesso a admin e operador; redireciona motorista para /motorista
export default function OperatorRoute() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  if (!user || (user.role !== "admin" && user.role !== "operador")) {
    return <Navigate to="/motorista" replace />;
  }
  return <Outlet />;
}