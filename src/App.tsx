import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { PlanificadorVagoneModule } from './components/PlanificadorVagoneModule';
import { verifySessionToken } from './services/authService';
import { ChefHat } from 'lucide-react';

const STORAGE_KEY_AUTH = 'vagone_planificador_auth_session_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Authenticate from local cryptographic session token on initial mount
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY_AUTH);
        if (storedUser) {
          const isValid = await verifySessionToken(storedUser);
          if (isValid) {
            setCurrentUser(storedUser);
          } else {
            localStorage.removeItem(STORAGE_KEY_AUTH);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkExistingAuth();
  }, []);

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.error(e);
    }
  };

  // While verifying stored credentials
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-pulse">
          <ChefHat className="w-8 h-8 text-slate-950" />
        </div>
      </div>
    );
  }

  // If user is not authenticated, show protected login screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Render the full isolated, namespaced module
  return (
    <PlanificadorVagoneModule
      currentUser={currentUser}
      onLogout={handleLogout}
      showHeaderNavbar={true}
    />
  );
}
