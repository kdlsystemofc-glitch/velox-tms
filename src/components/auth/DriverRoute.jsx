import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function DriverRoute() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;

  if (user?.role === "motorista") return <Outlet />;
  if (user?.role === "admin" || user?.role === "operator" || user?.role === "operador") {
    return <Navigate to="/admin" replace />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/sem-acesso" replace />;
}