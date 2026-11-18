import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getCurrentUser,
  getAccessToken,
} from '../services/googleAuth';
import {
  HardDrive,
  LogOut,
  FolderOpen,
  CheckCircle2,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface GoogleAuthButtonProps {
  onOpenDriveExplorer?: () => void;
  onAuthStateChange?: (user: User | null, hasToken: boolean) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onOpenDriveExplorer,
  onAuthStateChange,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setHasToken(!!token);
        setIsLoading(false);
        if (onAuthStateChange) onAuthStateChange(authenticatedUser, !!token);
      },
      () => {
        const current = getCurrentUser();
        setUser(current);
        setHasToken(false);
        setIsLoading(false);
        if (onAuthStateChange) onAuthStateChange(current, false);
      }
    );

    // Initial token check
    getAccessToken().then((token) => {
      if (token) {
        setHasToken(true);
        const current = getCurrentUser();
        if (current) setUser(current);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setHasToken(true);
        if (onAuthStateChange) onAuthStateChange(result.user, true);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err?.message || 'Échec de la connexion à Google Drive');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setHasToken(false);
      setMenuOpen(false);
      if (onAuthStateChange) onAuthStateChange(null, false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2030] border border-zinc-700 text-xs text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        <span className="hidden sm:inline">Google Drive...</span>
      </div>
    );
  }

  // Not connected or needs token
  if (!user || !hasToken) {
    return (
      <div className="relative">
        <button
          type="button"
          id="btn-google-drive-signin"
          onClick={handleSignIn}
          disabled={isSigningIn}
          title="Se connecter avec Google pour activer l'intégration Google Drive"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1c2030] hover:bg-[#252a3d] border border-zinc-700 hover:border-emerald-500/60 rounded-xl text-xs font-semibold text-zinc-100 transition-all shadow-sm group"
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            /* Official Google 'G' icon */
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
          )}
          <span className="truncate">Connecter Google Drive</span>
        </button>

        {errorMessage && (
          <div className="absolute right-0 top-full mt-1.5 z-50 p-2 bg-rose-950/95 border border-rose-600 rounded-lg text-[11px] text-rose-200 flex items-center gap-1.5 shadow-xl max-w-xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Connected to Google Drive
  return (
    <div className="relative">
      <button
        type="button"
        id="btn-google-account-menu"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1c2030] hover:bg-[#252a3d] border border-zinc-700 hover:border-emerald-500/70 rounded-xl text-xs font-semibold text-zinc-100 transition-all shadow-sm"
      >
        {/* User avatar or Google Drive badge */}
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Google User'}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/50"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center text-[10px]">
            {user.displayName ? user.displayName[0].toUpperCase() : 'G'}
          </div>
        )}

        <div className="flex items-center gap-1.5 max-w-[130px] sm:max-w-[170px] truncate text-left">
          <span className="truncate text-zinc-200">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Drive connecté" />
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {/* Account & Drive Menu Dropdown */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#181b27] border border-zinc-700 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3">
            {/* User Profile Header */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-750">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google User'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/50"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center text-sm">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'G'}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-zinc-100 truncate">
                  {user.displayName || 'Utilisateur Google'}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Google Drive connecté</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              {onOpenDriveExplorer && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDriveExplorer();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-[#222637] transition-colors text-left"
                >
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span>Explorer Google Drive</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Déconnecter Google Drive</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
