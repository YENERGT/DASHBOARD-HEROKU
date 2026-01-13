import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Detectar si estamos dentro de un iframe (Shopify embedded)
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// Detectar si estamos en contexto de Shopify
const isShopifyEmbedded = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('shop') || urlParams.has('host') || urlParams.has('embedded') || isInIframe();
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar si el usuario está autenticado al cargar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Escuchar mensajes de la ventana popup de autenticación
  useEffect(() => {
    const handleMessage = (event) => {
      // Verificar origen del mensaje
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AUTH_SUCCESS') {
        // Recargar la autenticación cuando el popup confirma éxito
        checkAuth();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  const login = () => {
    if (isShopifyEmbedded()) {
      // En Shopify: abrir popup para OAuth
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        '/auth/google?popup=true',
        'GoogleLogin',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      // Monitorear si el popup se cierra
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          // Verificar autenticación después de que se cierre el popup
          setTimeout(() => checkAuth(), 500);
        }
      }, 500);
    } else {
      // Fuera de Shopify: redirección normal
      window.location.href = '/auth/google';
    }
  };

  const logout = () => {
    if (isShopifyEmbedded()) {
      // En Shopify: hacer logout via fetch y luego recargar estado
      fetch('/auth/logout', { credentials: 'include' })
        .then(() => {
          setUser(null);
        })
        .catch(err => console.error('Logout error:', err));
    } else {
      window.location.href = '/auth/logout';
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
