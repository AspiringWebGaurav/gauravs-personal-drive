import { notFound } from 'next/navigation';
import { getShareDoc, getFileById } from '@/lib/firebase/firestore';
import { SharePageClient } from './SharePageClient';

interface SharePageProps {
  params: {
    token: string;
  };
}

export async function generateMetadata({ params }: SharePageProps) {
  try {
    // Get share document
    const { data: share, error } = await getShareDoc(params.token);
    if (error || !share) {
      return {
        title: 'Share Not Found - GPD',
        description: 'This share link is invalid or has expired.',
      };
    }

    // Cast share to access properties safely
    const shareData = share as any;

    // Check if expired
    if (shareData.expiresAt && new Date(shareData.expiresAt.toDate()) < new Date()) {
      return {
        title: 'Share Expired - GPD',
        description: 'This share link has expired.',
      };
    }

    const fileName = shareData.og?.name || 'Unknown File';
    const fileSize = shareData.og?.size || 0;
    const fileType = shareData.og?.type || 'file';

    return {
      title: `${fileName} — GPD`,
      description: `Download ${fileName} (${Math.round(fileSize / 1024)} KB) shared via Gaurav's Personal Drive`,
      openGraph: {
        title: `${fileName} — GPD`,
        description: `Download ${fileName} (${Math.round(fileSize / 1024)} KB)`,
        type: 'website',
        siteName: "Gaurav's Personal Drive",
        images: [
          {
            url: '/og-image.png', // You can create a branded OG image
            width: 1200,
            height: 630,
            alt: `${fileName} - GPD`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fileName} — GPD`,
        description: `Download ${fileName} (${Math.round(fileSize / 1024)} KB)`,
        images: ['/og-image.png'],
      },
    };
  } catch (error) {
    return {
      title: 'Error - GPD',
      description: 'An error occurred while loading this share.',
    };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  try {
    // Get share document
    const { data: share, error } = await getShareDoc(params.token);
    if (error || !share) {
      notFound();
    }

    // Cast share to access properties safely
    const shareData = share as any;

    // Check if expired
    if (shareData.expiresAt && new Date(shareData.expiresAt.toDate()) < new Date()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-900/20 dark:via-gray-900 dark:to-red-900/20">
          <div className="glass-card p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏰</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Share Link Expired
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This share link has expired and is no longer available for download.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Shared via GPD
            </div>
          </div>
        </div>
      );
    }

    // Get file document
    const { data: file, error: fileError } = await getFileById(shareData.fileId || 'unknown');
    if (fileError || !file) {
      notFound();
    }

    return (
      <SharePageClient
        share={share}
        file={file}
        portfolioUrl={process.env.NEXT_PUBLIC_PORTFOLIO_URL}
      />
    );
  } catch (error) {
    console.error('Share page error:', error);
    notFound();
  }
}