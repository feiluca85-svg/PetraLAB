"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

export type DeviceSession = {
  id: string;
  name: string;
  type: "mobile" | "desktop";
  lastActive: string;
  isCurrent: boolean;
};

type AuthRole = "student" | "admin" | null;

interface AuthContextType {
  role: AuthRole;
  isAuthenticated: boolean;
  loginAsStudent: (pin: string) => boolean;
  loginWithBiometrics: () => Promise<boolean>;
  loginAsAdmin: (user: string, pass: string) => boolean;
  logout: () => void;
  devices: DeviceSession[];
  removeDevice: (id: string) => void;
  isBiometricsAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// PIN predefinito per la figlia (configurabile)
const STUDENT_PIN = "1430";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AuthRole>(null);
  const [isReady, setIsReady] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Rileva supporto biometria & carica sessioni
  useEffect(() => {
    // Carica stato auth da localStorage per mantenerlo permanente (evita logout su reload)
    const savedRole = localStorage.getItem("petralab_role") as AuthRole;
    if (savedRole) {
      setRole(savedRole);
    }

    // Simula o carica dispositivi registrati
    const storedDevices = localStorage.getItem("petralab_devices");
    if (storedDevices) {
      setDevices(JSON.parse(storedDevices));
    } else {
      const initialDevices: DeviceSession[] = [
        {
          id: "dev-mac-1",
          name: "Mac Studio (Questo dispositivo)",
          type: "desktop",
          lastActive: "Adesso",
          isCurrent: true,
        },
      ];
      setDevices(initialDevices);
      localStorage.setItem("petralab_devices", JSON.stringify(initialDevices));
    }
    
    setIsReady(true);
  }, []);

  // Protezione rotte
  useEffect(() => {
    if (!isReady) return; // Aspetta di aver letto il localStorage!
    
    if (!role && pathname !== "/login") {
      router.push("/login");
    } else if (role === "student" && pathname.startsWith("/admin")) {
      router.push("/");
    } else if (role && pathname === "/login") {
      router.push(role === "admin" ? "/admin" : "/");
    }
  }, [role, pathname, router, isReady]);

  const registerCurrentDevice = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const currentName = isMobile ? "Smartphone (Accesso recente)" : "Computer Desktop (Accesso recente)";
    
    setDevices((prev) => {
      const updated = prev.map((d) => ({ ...d, isCurrent: false }));
      const existing = updated.find((d) => d.id === "current-session");
      if (existing) {
        existing.lastActive = "Adesso";
        existing.isCurrent = true;
        return [...updated];
      }
      const newDev: DeviceSession = {
        id: "current-session",
        name: currentName,
        type: isMobile ? "mobile" : "desktop",
        lastActive: "Adesso",
        isCurrent: true,
      };
      const list = [newDev, ...updated];
      localStorage.setItem("petralab_devices", JSON.stringify(list));
      return list;
    });
  };

  const loginAsStudent = (pin: string) => {
    if (pin === STUDENT_PIN) {
      setRole("student");
      localStorage.setItem("petralab_role", "student"); // Permanente!
      registerCurrentDevice();
      router.push("/");
      return true;
    }
    return false;
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    return false; // Disabilitato come richiesto
  };

  const loginAsAdmin = (user: string, pass: string) => {
    if (user.trim().toLowerCase() === "admin" && pass === "3019") {
      setRole("admin");
      localStorage.setItem("petralab_role", "admin"); // Permanente!
      registerCurrentDevice();
      router.push("/admin");
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem("petralab_role");
    router.push("/login");
  };

  const removeDevice = (id: string) => {
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      localStorage.setItem("petralab_devices", JSON.stringify(filtered));
      return filtered;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        isAuthenticated: !!role,
        loginAsStudent,
        loginWithBiometrics,
        loginAsAdmin,
        logout,
        devices,
        removeDevice,
        isBiometricsAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere utilizzato all'interno di AuthProvider");
  }
  return context;
}
