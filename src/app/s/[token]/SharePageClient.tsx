'use client';

import { useState, useEffect } from 'react';
import { FileDocument } from '@/types/files';
import { ShareDocument } from '@/types/share';
import { incrementDownloadCount } from '@/lib/firebase/firestore';
import { Download, Lock, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { formatBytes } from '@/lib/usage/tracking';

interface SharePageClientProps {
  share: any; // ShareDocument from server
  file: any; // FileDocument from server
  portfolioUrl?: string;
}

export const SharePageClient = ({ share, file, portfolioUrl }: SharePageClientProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!share.passwordRequired);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Auto-download after unlock
  useEffect(() => {
    if (isUnlocked && !downloadStarted) {
      // Start download automatically after a short delay
      const timer = setTimeout(() => {
        handleDownload();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isUnlocked, downloadStarted]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    try {
      // Verify password (simplified for demo - in production, hash and compare)
      // For demo purposes, any password works
      setIsUnlocked(true);
    } catch (error) {
      setPasswordError('Incorrect password');
    }
  };

  const handleDownload = async () => {
    if (isDownloading || downloadStarted) return;
    
    setIsDownloading(true);
    setDownloadStarted(true);

    try {
      // Increment download counter
      await incrementDownloadCount(share.id);

      // Create download URL
      const downloadUrl = `/api/download?token=${share.token}`;
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStarted(false); // Allow retry
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('document') || fileType.includes('text') || fileType.includes('pdf')) return '📄';
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('rar')) return '📦';
    return '📁';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-purple-900/20">
      {/* Navbar */}
      <nav className="glass-card border-b border-white/20 dark:border-gray-800/20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">GPD</span>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                Gaurav's Personal Drive
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {!isUnlocked ? (
            /* Password Form */
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Protected File
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This file is password protected. Enter the password to download.
              </p>

              <div className="space-y-4">
                <div className="text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getFileIcon(file.type)} {file.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div className="bg-blue-600 h-1 rounded-full w-0" />
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-red-600 dark:text-red-400 text-sm text-left">
                      {passwordError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!password}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Unlock & Download
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Download Card */
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">{getFileIcon(file.type)}</span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {file.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {formatBytes(file.size)} • Ready to download
              </p>

              {downloadStarted ? (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full animate-pulse w-full" />
                  </div>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✅ Download started automatically!
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If download doesn't start, click the button below
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4" />
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    🚀 Starting download...
                  </p>
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>
                  {isDownloading ? 'Downloading...' : downloadStarted ? 'Download Again' : 'Download Now'}
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card border-t border-white/20 dark:border-gray-800/20 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-400 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <span>© 2024 All rights reserved</span>
            {share.downloadCount !== undefined && (
              <span>• {share.downloadCount + 1} downloads</span>
            )}
          </div>
          
          {portfolioUrl && (
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </footer>
    </div>
  );
};