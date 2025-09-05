import { NextRequest, NextResponse } from 'next/server';
import { getFileById } from '@/lib/firebase/firestore';
import { getFileDownloadURL } from '@/lib/firebase/storage';
import { canDownload, trackDownload } from '@/lib/usage/tracking';
import { auth } from '@/lib/firebase/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get the current user from Firebase Auth
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: In a real implementation, you'd verify the Firebase token here
    // For now, we'll assume the request is authenticated

    // Get file document
    const { data: file, error: fileError } = await getFileById(fileId);
    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check download permissions - use a default UID for demo purposes
    const ownerUid = (file as any).ownerUid || 'demo-user';
    const fileSize = (file as any).size || 0;
    const { allowed, reason } = await canDownload(ownerUid, fileSize);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 429 });
    }

    // Cast file to any to access properties safely
    const fileData = file as any;
    const filePath = fileData.path || '';
    const fileName = fileData.name || 'download';
    const fileType = fileData.type || 'application/octet-stream';

    // Get download URL from Firebase Storage
    const { url, error: urlError } = await getFileDownloadURL(filePath);
    if (urlError || !url) {
      return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
    }

    // Track the download
    await trackDownload(ownerUid, fileSize);

    // Fetch the file from Firebase Storage
    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}