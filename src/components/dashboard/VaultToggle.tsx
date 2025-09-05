'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUserSettings, updateUserSettings } from '@/lib/firebase/firestore';
import { generateSalt, bufferToHex, deriveKeyPBKDF2 } from '@/lib/crypto/encryption';
import toast from 'react-hot-toast';

interface VaultToggleProps {
  isSecretMode: boolean;
  isVaultUnlocked: boolean;
  onToggle: (mode: boolean) => void;
  onVaultStatusChange: (unlocked: boolean) => void;
}

export const VaultToggle = ({ 
  isSecretMode, 
  isVaultUnlocked, 
  onToggle, 
  onVaultStatusChange 
}: VaultToggleProps) => {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [hasVaultPassword, setHasVaultPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkVaultStatus();
  }, [user]);

  const checkVaultStatus = async () => {
    if (!user) return;
    
    try {
      const { data: settings } = await getUserSettings(user.uid);
      setHasVaultPassword(!!settings?.secretVault?.hash);
    } catch (error) {
      console.error('Error checking vault status:', error);
    }
  };

  const handleToggleClick = () => {
    if (!isSecretMode) {
      // Switching to secret mode
      if (!hasVaultPassword) {
        setIsSettingUp(true);
        setShowPasswordModal(true);
      } else if (!isVaultUnlocked) {
        setIsSettingUp(false);
        setShowPasswordModal(true);
      } else {
        onToggle(true);
      }
    } else {
      // Switching back to normal mode
      onToggle(false);
    }
  };

  const validatePasswords = () => {
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return false;
    }
    if (isSettingUp && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const setupVaultPassword = async () => {
    if (!user || !validatePasswords()) return;

    setLoading(true);
    try {
      const salt = generateSalt();
      const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
      const saltHex = bufferToHex(saltBuffer);
      
      // Derive key from password for verification
      const key = await deriveKeyPBKDF2(password, salt);
      const keyBuffer = await crypto.subtle.exportKey('raw', key);
      const hash = bufferToHex(keyBuffer);

      const vaultSettings = {
        secretVault: {
          salt: saltHex,
          hash,
          createdAt: new Date(),
          encryptByDefault: true
        }
      };

      const { error } = await updateUserSettings(user.uid, vaultSettings);
      if (error) {
        throw new Error(error);
      }

      toast.success('Secret Vault password set successfully!');
      setHasVaultPassword(true);
      onVaultStatusChange(true);
      onToggle(true);
      closeModal();
    } catch (error) {
      console.error('Error setting up vault:', error);
      toast.error('Failed to set up Secret Vault');
    } finally {
      setLoading(false);
    }
  };

  const verifyVaultPassword = async () => {
    if (!user || !password) return;

    setLoading(true);
    try {
      const { data: settings } = await getUserSettings(user.uid);
      if (!settings?.secretVault) {
        throw new Error('Vault not set up');
      }

      const salt = new Uint8Array(Buffer.from(settings.secretVault.salt, 'hex'));
      const key = await deriveKeyPBKDF2(password, salt);
      const keyBuffer = await crypto.subtle.exportKey('raw', key);
      const hash = bufferToHex(keyBuffer);

      if (hash === settings.secretVault.hash) {
        toast.success('Secret Vault unlocked!');
        onVaultStatusChange(true);
        onToggle(true);
        closeModal();
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      console.error('Error verifying vault password:', error);
      toast.error('Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Normal Files
          </span>
          <button
            onClick={handleToggleClick}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSecretMode
                ? 'bg-purple-600 dark:bg-purple-500'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSecretMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Secret Vault
          </span>
        </div>

        {isSecretMode && (
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isVaultUnlocked ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {isVaultUnlocked ? 'Unlocked' : 'Locked'}
            </span>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeModal}
            />

            <div className="inline-block transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                  <span className="text-2xl">🔒</span>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {isSettingUp ? 'Set Up Secret Vault' : 'Unlock Secret Vault'}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isSettingUp
                        ? 'Create a password to encrypt and protect your secret files'
                        : 'Enter your password to access encrypted files'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder={isSettingUp ? "Choose a strong password" : "Enter your password"}
                    disabled={loading}
                  />
                </div>

                {isSettingUp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Confirm your password"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={isSettingUp ? setupVaultPassword : verifyVaultPassword}
                  disabled={loading || !password}
                  className="inline-flex w-full justify-center rounded-xl border border-transparent bg-purple-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isSettingUp ? 'Set Password' : 'Unlock Vault'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};