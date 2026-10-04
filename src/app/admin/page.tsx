"use client";

import { useEffect, useState } from "react";
import ParentDashboard from "@/components/ParentDashboard";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("petralab_theme");
    if (saved === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto relative sm:border-x sm:border-slate-200 ${
      isDarkMode ? "bg-[#111B21] border-[#222E35]" : "bg-[#F0F2F5] border-slate-200"
    }`}>
      <ParentDashboard
        isDarkMode={isDarkMode}
        onClose={() => router.push("/")}
      />
    </div>
  );
}
