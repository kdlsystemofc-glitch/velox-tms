import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

export default function AdminRoute() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;

  if (!user || user.role !== "admin") {
    toast({
      title: "Acesso negado",
      description: "Esta área é restrita a administradores.",
      variant: "destructive",
    });
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}