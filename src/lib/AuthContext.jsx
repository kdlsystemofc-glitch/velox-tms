import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user);
      }
    } catch (err) {
      console.error('Erro ao verificar sessão:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadUserProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Segurança: NINGUÉM vira admin sozinho. Sem perfil = 'pending' (sem acesso);
      // desativado pelo admin (active=false) também perde o acesso.
      const effectiveRole = profile
        ? (profile.active === false ? 'pending' : (profile.role || 'pending'))
        : 'pending';

      const userWithRole = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        role: effectiveRole,
        driver_id: profile?.driver_id || null,
      };

      setUser(userWithRole);
      setIsAuthenticated(true);

      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      setAppPublicSettings(settings);

      // Quem entra sem perfil fica como 'pending' até um admin liberar o papel.
      if (!profile) {
        await supabase.from('user_profiles').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || '',
          role: 'pending',
          active: false,
        });
      }
    } catch (err) {
      // Em erro, NÃO concede admin — mantém autenticado sem privilégio.
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        role: 'pending',
      });
      setIsAuthenticated(true);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  };

  const loginWithGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth,
      isLoadingPublicSettings, appPublicSettings,
      login, loginWithGoogle, logout, checkSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};

export default AuthContext;
