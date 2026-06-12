import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function DriverRoute() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;

  if (!user || user.role !== "motorista") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}