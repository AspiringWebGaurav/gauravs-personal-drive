'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { FileDocument } from '@/types/files';
import { X, Copy, Share2, Lock, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  file: FileDocument;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog = ({ file, isOpen, onClose }: ShareDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareSettings, setShareSettings] = useState({
    passwordRequired: false,
    password: '',
    expiresDays: undefined as number | undefined
  });
  const [step, setStep] = useState<'settings' | 'success'>('settings');

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Generate a simple token for demo
      const token = Math.random().toString(36).substring(2, 15);
      const url = `${window.location.origin}/s/${token}`;
      
      // In a real app, this would call the share API
      setShareUrl(url);
      setStep('success');
      toast.success('Share link created successfully!');
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Check out this file: ${file.name}\n\n${shareUrl}\n\nShared via GPD 🚀`
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleReset = () => {
    setStep('settings');
    setShareUrl('');
    setShareSettings({
      passwordRequired: false,
      password: '',
      expiresDays: undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {step === 'settings' && (
            <>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Share File
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a shareable link for "{file.name}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="passwordRequired"
                    checked={shareSettings.passwordRequired}
                    onChange={(e) => setShareSettings(prev => ({ 
                      ...prev, 
                      passwordRequired: e.target.checked,
                      password: e.target.checked ? prev.password : ''
                    }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="passwordRequired" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Lock className="w-4 h-4 mr-1" />
                    Require password
                  </label>
                </div>

                {shareSettings.passwordRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={shareSettings.password}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter password for this share"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="hasExpiry"
                    checked={shareSettings.expiresDays !== undefined}
                    onChange={(e) => setShareSettings(prev => ({ 
                      ...prev, 
                      expiresDays: e.target.checked ? 7 : undefined
                    }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="hasExpiry" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-1" />
                    Set expiry
                  </label>
                </div>

                {shareSettings.expiresDays !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expires in (days)
                    </label>
                    <input
                      type="number"
                      value={shareSettings.expiresDays}
                      onChange={(e) => setShareSettings(prev => ({ 
                        ...prev, 
                        expiresDays: parseInt(e.target.value) || 7
                      }))}
                      min="1"
                      max="365"
                      className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={loading || (shareSettings.passwordRequired && !shareSettings.password)}
                  className="inline-flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Creating...' : 'Create Share Link'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Share Link Created!
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your file is ready to share. Copy the link or share via WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent border-none text-sm text-gray-900 dark:text-white focus:outline-none"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex w-full justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Share via WhatsApp
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Create Another
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 inline-flex justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};