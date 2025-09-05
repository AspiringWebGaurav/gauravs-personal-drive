import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getFileById, createShareDoc, getUserSettings } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, settings } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get the current user from Firebase Auth
    // Note: In a real implementation, you'd verify the Firebase token here
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file document to verify ownership
    const { data: file, error: fileError } = await getFileById(fileId);
    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Cast file to access properties safely
    const fileData = file as any;
    const ownerUid = fileData.ownerUid || 'demo-user';

    // Generate unique share token
    const token = nanoid(16);
    
    // Get user settings for default share preferences
    const { data: userSettings } = await getUserSettings(ownerUid);
    
    // Prepare share document data
    const shareData: any = {
      fileId,
      token,
      downloadCount: 0,
      og: {
        name: fileData.name || 'Unknown File',
        size: fileData.size || 0,
        type: fileData.type || 'application/octet-stream'
      }
    };

    // Handle expiry
    if (settings?.expiresDays || userSettings?.shareDefaults?.expiresDays) {
      const expiresDays = settings?.expiresDays || userSettings?.shareDefaults?.expiresDays;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);
      shareData.expiresAt = expiresAt;
    }

    // Handle password protection
    const requirePassword = settings?.passwordRequired ?? userSettings?.shareDefaults?.passwordRequired ?? false;
    if (requirePassword && settings?.password) {
      // Hash password with salt
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(settings.password);
      const saltedPassword = new Uint8Array(passwordData.length + salt.length);
      saltedPassword.set(passwordData);
      saltedPassword.set(salt, passwordData.length);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', saltedPassword);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      
      shareData.passwordRequired = true;
      shareData.passwordHash = hashHex;
      shareData.passwordSalt = saltHex;
    }

    // Create share document
    const { id: shareId, error: createError } = await createShareDoc(shareData);
    if (createError || !shareId) {
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    // Return share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${token}`;
    
    return NextResponse.json({
      success: true,
      shareUrl,
      token,
      expiresAt: shareData.expiresAt,
      passwordRequired: shareData.passwordRequired
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}