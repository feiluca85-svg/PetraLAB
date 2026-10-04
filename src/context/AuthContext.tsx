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
const STUDENT_PIN = "1234";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AuthRole>(null);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Rileva supporto biometria & carica sessioni
  useEffect(() => {
    // Controllo WebAuthn / Biometria (Touch ID / Face ID)
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((available) => setIsBiometricsAvailable(available))
        .catch(() => setIsBiometricsAvailable(false));
    }

    // Carica stato auth da sessionStorage
    const savedRole = sessionStorage.getItem("petralab_role") as AuthRole;
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
        {
          id: "dev-iphone-daughter",
          name: "iPhone di Mia Figlia",
          type: "mobile",
          lastActive: "2 ore fa",
          isCurrent: false,
        },
        {
          id: "dev-phone-admin",
          name: "Smartphone Amministratore",
          type: "mobile",
          lastActive: "Ieri, 19:30",
          isCurrent: false,
        },
      ];
      setDevices(initialDevices);
      localStorage.setItem("petralab_devices", JSON.stringify(initialDevices));
    }
  }, []);

  // Protezione rotte
  useEffect(() => {
    if (!role && pathname !== "/login") {
      router.push("/login");
    } else if (role === "student" && pathname.startsWith("/admin")) {
      router.push("/");
    }
  }, [role, pathname, router]);

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
      sessionStorage.setItem("petralab_role", "student");
      registerCurrentDevice();
      router.push("/");
      return true;
    }
    return false;
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    try {
      // Simula/Interroga la biometria nativa
      if (!window.PublicKeyCredential) return false;
      // Per una demo WebAuthn locale possiamo concedere accesso immediato se supportato
      setRole("student");
      sessionStorage.setItem("petralab_role", "student");
      registerCurrentDevice();
      router.push("/");
      return true;
    } catch {
      return false;
    }
  };

  const loginAsAdmin = (user: string, pass: string) => {
    // Credenziali demo amministratore (personalizzabili)
    if (user.trim().toLowerCase() === "admin" && pass === "admin123") {
      setRole("admin");
      sessionStorage.setItem("petralab_role", "admin");
      registerCurrentDevice();
      router.push("/admin");
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    sessionStorage.removeItem("petralab_role");
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
