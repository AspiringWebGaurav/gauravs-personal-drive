# Gaurav's Personal Drive

A secure, fast, and minimal cloud storage solution built for personal use. Features a glass-inspired design with dark/light theme support, drag & drop file uploads, folder organization, and real-time synchronization.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextjs)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-10+-orange?logo=firebase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## ✨ Features

- **🔐 Secure Authentication** - Google OAuth with Firebase Auth
- **📁 Folder Organization** - Create and manage folders to organize your files
- **⬆️ Drag & Drop Upload** - Seamless file uploading with progress tracking
- **🔄 Real-time Sync** - Live updates using Firebase Firestore
- **👀 Dual View Modes** - Switch between grid and table layouts
- **💾 Usage Tracking** - Monitor storage usage with visual indicators
- **🎨 Glass Design** - Beautiful glass-morphism UI with theme support
- **📱 Responsive** - Works perfectly on all devices
- **⚡ Blazing Fast** - Built with Next.js 15 and optimized for speed

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS 4
- **UI Components**: shadcn/ui, Lucide Icons
- **Backend**: Firebase (Auth, Firestore, Storage, Realtime DB)
- **Styling**: TailwindCSS with CSS variables, next-themes
- **State Management**: React Context + Firebase real-time listeners
- **File Handling**: Firebase Storage with resumable uploads
- **Authentication**: Firebase Auth with Google provider

## 📦 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with the following services enabled:
  - Authentication (Google provider)
  - Firestore Database
  - Firebase Storage
  - Realtime Database (optional)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gauravs-personal-drive.git
cd gauravs-personal-drive
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "gauravs-personal-drive"
3. Enable Authentication with Google provider
4. Create a Firestore Database
5. Create a Firebase Storage bucket
6. (Optional) Create a Realtime Database

#### Get Firebase Configuration

1. Go to Project Settings > General > Your apps
2. Add a web app and copy the configuration
3. Create `.env.local` file in the project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gauravs-personal-drive.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://gauravs-personal-drive-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gauravs-personal-drive
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gauravs-personal-drive.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@gauravs-personal-drive.iam.gserviceaccount.com
FIREBASE_ADMIN_PROJECT_ID=gauravs-personal-drive

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-string-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000
```

#### Generate Service Account Key

1. Go to Firebase Console > Project Settings > Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the `private_key` and `client_email` for your `.env.local`

### 4. Deploy Firebase Security Rules

Deploy the security rules to Firebase:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules  
firebase deploy --only storage

# Deploy Database rules (if using Realtime Database)
firebase deploy --only database
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Project Structure

```
gauravs-personal-drive/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── login/             # Login page
│   │   ├── dashboard/         # Dashboard page
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   └── health/        # Health check endpoint
│   │   ├── layout.js          # Root layout with providers
│   │   └── globals.css        # Global styles with glass effects
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utilities and configurations
│   │   ├── firebaseClient.ts  # Firebase client config
│   │   ├── firebaseAdmin.ts   # Firebase admin config
│   │   ├── auth.ts           # Authentication utilities
│   │   └── utils.js          # General utilities
│   ├── types/                 # TypeScript type definitions
│   └── middleware.ts          # Next.js middleware for auth
├── public/                    # Static assets
├── firestore.rules           # Firestore security rules
├── storage.rules            # Firebase Storage rules
├── database.rules.json      # Realtime Database rules
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

- **NEXT_PUBLIC_FIREBASE_*** - Firebase client configuration
- **FIREBASE_ADMIN_*** - Firebase Admin SDK configuration
- **NEXTAUTH_SECRET** - Secret for session encryption
- **NEXT_PUBLIC_APP_URL** - Application URL

### Firebase Rules

The application uses permissive Firebase rules suitable for personal use:

- **Firestore**: Authenticated users can read/write all documents
- **Storage**: Authenticated users can read/write all files  
- **Database**: Authenticated users can read/write all data

⚠️ **Security Note**: These rules are designed for personal use only. For production applications with multiple users, implement more restrictive rules.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## 📊 Usage Tracking

The application includes storage quota tracking:

- **Default Limit**: 5GB (configurable)
- **Real-time Updates**: Usage updates automatically
- **Visual Indicators**: Progress bar with color coding
- **Warnings**: Alerts when approaching or exceeding limits

## 🔒 Security Features

- **Authentication Required**: All routes protected by Firebase Auth
- **Session Management**: Secure HTTP-only cookies
- **CORS Protection**: Configured for production domains
- **Input Validation**: Client and server-side validation
- **File Type Restrictions**: Configurable file type limits

## 🎨 Theming

The application supports three theme modes:

- **Light Mode**: Clean, minimal light theme
- **Dark Mode**: Glass-inspired dark theme
- **System**: Automatic theme based on system preference

Themes persist across sessions and sync across devices.

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Common Issues

**Authentication not working:**
- Verify Firebase configuration in `.env.local`
- Check if Google provider is enabled in Firebase Console
- Ensure domain is added to authorized domains

**File uploads failing:**
- Check Firebase Storage rules
- Verify CORS configuration
- Check file size limits (default: 100MB)

**Build errors:**
- Ensure all environment variables are set
- Check TypeScript configuration
- Verify all dependencies are installed

### Health Check

Visit `/api/health` to check application status:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "storage": "connected", 
    "auth": "connected"
  }
}
```

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔮 Future Enhancements

- [ ] File sharing with expiring links
- [ ] Advanced search and filtering
- [ ] File versioning and history
- [ ] Bulk operations (select multiple files)
- [ ] Image/document preview
- [ ] Offline support with service workers
- [ ] Mobile app using React Native
- [ ] Integration with cloud providers (Google Drive, OneDrive)

---

**Built with ❤️ by Gaurav**

*A modern, secure, and beautiful personal cloud storage solution.*
