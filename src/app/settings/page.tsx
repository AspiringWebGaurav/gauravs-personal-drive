'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUserSettings, updateUserSettings } from '@/lib/firebase/firestore';
import { generateSalt, bufferToHex, deriveKeyPBKDF2 } from '@/lib/crypto/encryption';
import { UserSettings } from '@/types/usage';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, Share2, ExternalLink, Save } from 'lucide-react';
import Link from 'next/link';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [shareDefaults, setShareDefaults] = useState({
    passwordRequired: false,
    expiresDays: undefined as number | undefined
  });
  const [vaultPassword, setVaultPassword] = useState('');
  const [newVaultPassword, setNewVaultPassword] = useState('');
  const [confirmVaultPassword, setConfirmVaultPassword] = useState('');
  const [encryptByDefault, setEncryptByDefault] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const { data } = await getUserSettings(user.uid);
      setSettings(data);
      
      if (data) {
        setPortfolioUrl(data.portfolioUrl || '');
        setShareDefaults({
          passwordRequired: data.shareDefaults?.passwordRequired || false,
          expiresDays: data.shareDefaults?.expiresDays
        });
        setEncryptByDefault(data.secretVault?.encryptByDefault !== false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updatedSettings = {
        portfolioUrl: portfolioUrl || undefined,
        shareDefaults: {
          passwordRequired: shareDefaults.passwordRequired,
          expiresDays: shareDefaults.expiresDays || undefined
        }
      };

      const { error } = await updateUserSettings(user.uid, updatedSettings);
      if (error) {
        throw new Error(error);
      }

      toast.success('General settings saved successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast.error('Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVaultPassword = async () => {
    if (!user) return;
    
    if (!newVaultPassword || newVaultPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (newVaultPassword !== confirmVaultPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      // If vault exists, verify current password first
      if (settings?.secretVault?.hash && !vaultPassword) {
        toast.error('Please enter your current vault password');
        setSaving(false);
        return;
      }

      // Verify current password if vault exists
      if (settings?.secretVault?.hash && vaultPassword) {
        const salt = new Uint8Array(Buffer.from(settings.secretVault.salt, 'hex'));
        const key = await deriveKeyPBKDF2(vaultPassword, salt);
        const keyBuffer = await crypto.subtle.exportKey('raw', key);
        const hash = bufferToHex(keyBuffer);
        
        if (hash !== settings.secretVault.hash) {
          toast.error('Current password is incorrect');
          setSaving(false);
          return;
        }
      }

      // Create new password hash
      const salt = generateSalt();
      const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
      const saltHex = bufferToHex(saltBuffer);
      const key = await deriveKeyPBKDF2(newVaultPassword, salt);
      const keyBuffer = await crypto.subtle.exportKey('raw', key);
      const hash = bufferToHex(keyBuffer);

      const vaultSettings = {
        secretVault: {
          salt: saltHex,
          hash,
          createdAt: new Date(),
          encryptByDefault
        }
      };

      const { error } = await updateUserSettings(user.uid, vaultSettings);
      if (error) {
        throw new Error(error);
      }

      toast.success(settings?.secretVault?.hash ? 'Vault password updated successfully' : 'Vault password set successfully');
      setVaultPassword('');
      setNewVaultPassword('');
      setConfirmVaultPassword('');
      await loadSettings();
    } catch (error) {
      console.error('Error updating vault password:', error);
      toast.error('Failed to update vault password');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEncryption = async () => {
    if (!user || !settings?.secretVault?.hash) return;
    
    setSaving(true);
    try {
      const vaultSettings = {
        secretVault: {
          ...settings.secretVault,
          encryptByDefault
        }
      };

      const { error } = await updateUserSettings(user.uid, vaultSettings);
      if (error) {
        throw new Error(error);
      }

      toast.success('Encryption settings updated');
      await loadSettings();
    } catch (error) {
      console.error('Error updating encryption settings:', error);
      toast.error('Failed to update encryption settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account and preferences
            </p>
          </div>
        </div>

        {/* General Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                General Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure your portfolio link and sharing preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Portfolio URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://your-portfolio.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This link will appear on public share pages
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={shareDefaults.passwordRequired}
                    onChange={(e) => setShareDefaults(prev => ({ ...prev, passwordRequired: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Require password for new shares
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default expiry (days)
                </label>
                <input
                  type="number"
                  value={shareDefaults.expiresDays || ''}
                  onChange={(e) => setShareDefaults(prev => ({ 
                    ...prev, 
                    expiresDays: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Never expire"
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>

        {/* Secret Vault Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Secret Vault
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {settings?.secretVault?.hash 
                  ? 'Manage your encrypted vault settings'
                  : 'Set up your encrypted vault'
                }
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Password Management */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                {settings?.secretVault?.hash ? 'Change Vault Password' : 'Set Vault Password'}
              </h3>
              
              <div className="space-y-4">
                {settings?.secretVault?.hash && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {settings?.secretVault?.hash ? 'New Password' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={newVaultPassword}
                    onChange={(e) => setNewVaultPassword(e.target.value)}
                    placeholder="Enter a strong password (8+ characters)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmVaultPassword}
                    onChange={(e) => setConfirmVaultPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleUpdateVaultPassword}
                  disabled={saving || !newVaultPassword || !confirmVaultPassword}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {saving ? 'Updating...' : settings?.secretVault?.hash ? 'Update Password' : 'Set Password'}
                </button>
              </div>
            </div>

            {/* Encryption Settings */}
            {settings?.secretVault?.hash && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Encryption Preferences
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={encryptByDefault}
                      onChange={(e) => setEncryptByDefault(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Encrypt Secret Vault files by default
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                    When enabled, all files uploaded to the Secret Vault will be encrypted automatically
                  </p>

                  <button
                    onClick={handleUpdateEncryption}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Updating...' : 'Update Encryption Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.displayName || 'Not provided'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.email}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Vault Status:</span>
              <span className={`text-sm font-medium ${
                settings?.secretVault?.hash 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {settings?.secretVault?.hash ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}