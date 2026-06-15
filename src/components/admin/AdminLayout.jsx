import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`transition-all duration-300 ${
          collapsed ? "ml-[64px]" : "ml-56"
        }`}
      >
        <AdminTopbar />
        <main className="px-5 py-5 max-w-[1600px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}