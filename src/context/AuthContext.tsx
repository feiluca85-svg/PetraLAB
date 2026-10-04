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

  const registerBiometrics = async () => {
    if (!window.PublicKeyCredential) return false;
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "PetraLAB" },
          user: { id: userId, name: "Studente", displayName: "Studente" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: true
          },
          timeout: 60000,
        }
      });
      localStorage.setItem("petralab_has_passkey", "true");
      return true;
    } catch (e) {
      console.error("Registrazione biometrica fallita:", e);
      return false;
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) return false;
      
      const hasPasskey = localStorage.getItem("petralab_has_passkey");
      
      if (!hasPasskey) {
        // Se è la prima volta, crea la chiave biometrica (Passkey)
        const registered = await registerBiometrics();
        if (!registered) return false;
      } else {
        // Altrimenti, richiedi lo sblocco biometrico
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        
        await navigator.credentials.get({
          publicKey: {
            challenge,
            userVerification: "required"
          }
        });
      }

      setRole("student");
      sessionStorage.setItem("petralab_role", "student");
      registerCurrentDevice();
      router.push("/");
      return true;
    } catch (error) {
      console.error("Autenticazione biometrica fallita:", error);
      return false;
    }
  };

  const loginAsAdmin = (user: string, pass: string) => {
    // Credenziali demo amministratore (personalizzabili)
    if (user.trim().toLowerCase() === "admin" && pass === "3019") {
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
