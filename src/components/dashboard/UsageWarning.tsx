'use client';

import { useState } from 'react';
import { UsageStatus } from '@/types/usage';
import { formatBytes, getUsagePercentage } from '@/lib/usage/tracking';

interface UsageWarningProps {
  usage: UsageStatus;
}

export const UsageWarning = ({ usage }: UsageWarningProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Check if any warning should be shown
  const hasWarnings = Object.values(usage.warnings).some(Boolean);
  const hasBlocks = Object.values(usage.blocked).some(Boolean);

  if (!hasWarnings && !hasBlocks) return null;
  if (dismissed && !hasBlocks) return null; // Don't allow dismissing blocks

  const getAlertLevel = () => {
    if (hasBlocks) return 'error';
    if (hasWarnings) return 'warning';
    return 'info';
  };

  const alertLevel = getAlertLevel();

  const alertClasses = {
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
  };

  const getWarningMessages = () => {
    const messages: string[] = [];

    if (usage.blocked.storage) {
      messages.push(`Storage limit exceeded (${formatBytes(usage.current.storageBytesUsed)} / ${formatBytes(usage.limits.storageBytes)})`);
    } else if (usage.warnings.storage) {
      messages.push(`Storage usage high (${getUsagePercentage(usage.current.storageBytesUsed, usage.limits.storageBytes).toFixed(0)}%)`);
    }

    if (usage.blocked.dailyDownloads) {
      messages.push(`Daily download limit exceeded (${formatBytes(usage.current.downloadsToday)} / ${formatBytes(usage.limits.downloadsDayBytes)})`);
    } else if (usage.warnings.dailyDownloads) {
      messages.push(`Daily downloads high (${getUsagePercentage(usage.current.downloadsToday, usage.limits.downloadsDayBytes).toFixed(0)}%)`);
    }

    if (usage.blocked.monthlyUploads) {
      messages.push(`Monthly upload limit exceeded (${usage.current.uploadsMonth} / ${usage.limits.uploadsMonth})`);
    } else if (usage.warnings.monthlyUploads) {
      messages.push(`Monthly uploads high (${getUsagePercentage(usage.current.uploadsMonth, usage.limits.uploadsMonth).toFixed(0)}%)`);
    }

    if (usage.blocked.monthlyDownloads) {
      messages.push(`Monthly download limit exceeded (${usage.current.downloadsMonth} / ${usage.limits.downloadsMonth})`);
    } else if (usage.warnings.monthlyDownloads) {
      messages.push(`Monthly downloads high (${getUsagePercentage(usage.current.downloadsMonth, usage.limits.downloadsMonth).toFixed(0)}%)`);
    }

    return messages;
  };

  const messages = getWarningMessages();
  if (messages.length === 0) return null;

  return (
    <div className={`border-l-4 p-4 ${alertClasses[alertLevel]}`}>
      <div className="flex items-start justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            {alertLevel === 'error' && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {alertLevel === 'warning' && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {alertLevel === 'info' && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              {alertLevel === 'error' && 'Service Limits Exceeded'}
              {alertLevel === 'warning' && 'Approaching Service Limits'}
              {alertLevel === 'info' && 'Usage Information'}
            </h3>
            <div className="mt-2 text-sm">
              <ul className="list-disc list-inside space-y-1">
                {messages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
            {alertLevel === 'error' && (
              <div className="mt-3 text-sm">
                <p>Some features may be temporarily unavailable until usage resets or you upgrade your plan.</p>
              </div>
            )}
          </div>
        </div>
        
        {alertLevel !== 'error' && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => setDismissed(true)}
                className="inline-flex rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};