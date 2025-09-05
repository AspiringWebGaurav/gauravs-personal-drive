# Gaurav's Personal Drive (GPD)

A production-ready, private cloud storage application built with Next.js 14, Firebase, and TypeScript. Optimized for India users with premium features including Secret Vault encryption, one-tap sharing, and comprehensive usage monitoring.

![GPD Screenshot](https://img.shields.io/badge/Status-Production%20Ready-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Firebase](https://img.shields.io/badge/Firebase-10.7.2-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🚀 Features

### Core Features
- **🔐 Google Sign-In Only**: Secure authentication with no artificial limits
- **📁 File Management**: Drag & drop uploads with progress tracking
- **🔒 Secret Vault**: Encrypted storage with password protection
- **📤 One-Tap Sharing**: Generate branded share links instantly
- **📱 PWA Support**: Installable with offline capabilities
- **📊 Usage Monitoring**: Real-time tracking with Firebase quota warnings

### Premium Features
- **🎨 Premium UI**: Glassy effects, rounded corners, dark mode support
- **⚡ Optimized for India**: Fast loading, mobile-first design
- **🔄 Resumable Uploads**: Handle large files with progress tracking
- **🛡️ Client-Side Encryption**: AES-GCM with PBKDF2 key derivation
- **📈 Usage Analytics**: Track storage, bandwidth, and operations
- **🔗 Branded Sharing**: Custom portfolio links on share pages

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom premium design
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **Encryption**: Web Crypto API with AES-GCM
- **PWA**: Service Worker with caching strategies

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Main dashboard
│   ├── settings/          # User settings
│   ├── s/[token]/        # Public share pages
│   └── api/              # API routes
├── components/
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── layout/           # Layout components
├── lib/
│   ├── firebase/         # Firebase utilities
│   ├── crypto/           # Encryption utilities
│   └── usage/            # Usage tracking
└── types/                # TypeScript definitions
```

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with the following services:
  - Authentication (Google provider)
  - Firestore Database
  - Storage
  - Hosting (optional)
- Google Cloud Console project for OAuth setup

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd gauravs-personal-drive
npm install --legacy-peer-deps
```

### 2. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: `gauravs-personal-drive`
3. Enable Google Analytics (optional)

#### Enable Authentication
1. Go to Authentication > Sign-in method
2. Enable Google provider
3. Add your domain to authorized domains

#### Setup Firestore Database
1. Go to Firestore Database
2. Create database in production mode
3. Select region: `asia-south1` (Mumbai)

#### Setup Storage
1. Go to Storage
2. Get started with default security rules
3. Select region: `asia-south1` (Mumbai)

#### Get Firebase Config
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Create a web app or use existing config
4. Copy the configuration object

### 3. Environment Configuration

Create `.env.local` with your Firebase credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="gauravs-personal-drive.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="your-database-url"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="gauravs-personal-drive"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="gauravs-personal-drive.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"

# Portfolio & Branding
NEXT_PUBLIC_PORTFOLIO_URL="https://gaurav-webdev-portfolio.vercel.app/"

# Usage Limits Configuration (Firebase Free Tier)
NEXT_PUBLIC_LIMIT_STORAGE_BYTES="5368709120"         # 5 GiB
NEXT_PUBLIC_LIMIT_DOWNLOADS_DAY_BYTES="1073741824"   # 1 GiB
NEXT_PUBLIC_LIMIT_UPLOADS_MONTH_COUNT="5000"
NEXT_PUBLIC_LIMIT_DOWNLOADS_MONTH_COUNT="50000"
NEXT_PUBLIC_LIMIT_FIRESTORE_READS_DAY="50000"
NEXT_PUBLIC_LIMIT_FIRESTORE_WRITES_DAY="50000"
NEXT_PUBLIC_LIMIT_HOSTING_BW_DAY_BYTES="377487360"   # 360 MB

# App Configuration
NEXT_PUBLIC_APP_NAME="Gaurav's Personal Drive"
NEXT_PUBLIC_APP_SHORT_NAME="GPD"
```

### 4. Firebase Security Rules

#### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Storage Rules
```bash
firebase deploy --only storage:rules
```

The rules files (`firestore.rules` and `storage.rules`) are already configured for authenticated access only.

### 5. PWA Icons (Optional)

Add the following icon files to `/public/`:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels) 
- `apple-touch-icon.png` (180x180 pixels)

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables from `.env.local`
3. Deploy automatically on push to main branch

### Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting
```

## 📊 Firebase Usage Limits & Monitoring

GPD includes comprehensive usage monitoring for Firebase Free Tier limits:

### Storage Limits
- **Storage**: 5 GiB total
- **Downloads**: 1 GiB per day
- **Uploads**: 5,000 per month
- **Downloads**: 50,000 per month

### Firestore Limits
- **Reads**: 50,000 per day
- **Writes**: 50,000 per day
- **Storage**: 1 GiB

### Hosting Limits
- **Storage**: 10 GiB
- **Bandwidth**: 360 MB per day

### Usage Tracking Features
- **Real-time monitoring**: Track all operations
- **Warning system**: Alerts at 80% of limits
- **Hard blocks**: Prevent operations at 100% of limits
- **Auto-reset**: Daily/monthly counters reset automatically
- **Dashboard display**: Usage stats in footer

## 🔐 Security Features

### Authentication
- Google OAuth 2.0 only
- No username/password authentication
- Session management with Firebase Auth

### Secret Vault
- Client-side encryption with AES-GCM
- PBKDF2 key derivation from user password
- Encrypted file metadata stored in Firestore
- Password never stored on server

### Data Protection
- All user data belongs to authenticated user
- Simple Firebase rules for personal use
- No cross-user data access
- Secure file download through API routes

## 🧪 Testing Checklist

### Authentication Testing
- [ ] Google sign-in works correctly
- [ ] Sign-out clears session
- [ ] Protected routes redirect to login
- [ ] User profile displays correctly

### File Management Testing
- [ ] Drag & drop upload works
- [ ] File progress tracking works
- [ ] File list displays correctly
- [ ] File download works
- [ ] File deletion works

### Secret Vault Testing
- [ ] Vault password setup works
- [ ] Vault unlock/lock works
- [ ] Secret files upload to separate location
- [ ] Encrypted files are properly marked
- [ ] Vault settings update correctly

### Usage Monitoring Testing
- [ ] Usage stats display correctly
- [ ] Warnings appear at 80% thresholds
- [ ] Blocks prevent operations at 100%
- [ ] Counters reset properly (daily/monthly)
- [ ] Usage updates after operations

### Settings Testing
- [ ] General settings save correctly
- [ ] Portfolio URL updates
- [ ] Share defaults work
- [ ] Vault password changes work
- [ ] Encryption toggle works

### PWA Testing
- [ ] App installs as PWA
- [ ] Offline functionality works
- [ ] Icons display correctly
- [ ] Shortcuts work

### Responsive Design Testing
- [ ] Works on mobile devices
- [ ] 100dvh layout maintained
- [ ] Touch interactions work
- [ ] Loading states appropriate

## 🔧 Configuration Options

### Usage Limits Customization
Modify environment variables to adjust Firebase quota monitoring:

```env
# Increase storage limit to 10 GiB
NEXT_PUBLIC_LIMIT_STORAGE_BYTES="10737418240"

# Increase daily downloads to 2 GiB  
NEXT_PUBLIC_LIMIT_DOWNLOADS_DAY_BYTES="2147483648"
```

### App Branding Customization
```env
# Change app name and branding
NEXT_PUBLIC_APP_NAME="Your Personal Drive"
NEXT_PUBLIC_APP_SHORT_NAME="YPD"
NEXT_PUBLIC_PORTFOLIO_URL="https://your-portfolio.com"
```

### Regional Optimization
The app is optimized for India:
- Firebase region: `asia-south1` (Mumbai)
- CDN optimization for Indian networks
- Mobile-first responsive design
- Lightweight assets and lazy loading

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Issues**
- Verify all environment variables are correct
- Check Firebase project configuration
- Ensure services are enabled in Firebase Console

**Upload Failures**
- Check Firebase Storage rules
- Verify user authentication
- Monitor usage limits in dashboard

**Build Errors**
- Run `npm install --legacy-peer-deps` for dependency conflicts
- Clear Next.js cache: `rm -rf .next`
- Update TypeScript: `npm update typescript`

### Debug Mode
Enable debug logging by adding to `.env.local`:
```env
NEXT_PUBLIC_DEBUG=true
```

## 📄 License

This project is private and proprietary to Gaurav.

## 🤝 Contributing

This is a personal project. For issues or suggestions, please create an issue in the repository.

---

**Made with ❤️ by Gaurav** | [Portfolio](https://gaurav-webdev-portfolio.vercel.app/) | GPD v1.0.0
