import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BurnControlProvider } from "@/components/providers/BurnControlProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://gauravs-personal-drive.vercel.app"),
  title: {
    default: "Gaurav's Personal Drive",
    template: "%s | Gaurav's Personal Drive"
  },
  description: "Secure personal drive and file manager by Gaurav — fast uploads, private links, and anywhere access.",
  keywords: ["personal drive", "cloud storage", "file manager", "uploads", "private links", "Gaurav"],
  authors: [{ name: "Gaurav" }],
  creator: "Gaurav",
  publisher: "Gaurav",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gaurav Drive",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    shortcut: "/icon-32x32.png",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/icon-16x16.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/icon-32x32.png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Gaurav's Personal Drive",
    title: "Gaurav's Personal Drive",
    description: "Secure personal drive and file manager by Gaurav.",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Gaurav's Personal Drive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaurav's Personal Drive",
    description: "Secure personal drive and file manager by Gaurav.",
    images: ["/icon-512x512.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0fb9b1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationProvider>
            <PWAProvider>
              <AuthProvider>
                <BurnControlProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </BurnControlProvider>
              </AuthProvider>
            </PWAProvider>
            <ToastContainer
              position="top-right"
              autoClose={2000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover={false}
              theme="colored"
            />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
