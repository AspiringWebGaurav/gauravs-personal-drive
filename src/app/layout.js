import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Gaurav's Personal Drive",
    template: "%s | Gaurav's Personal Drive"
  },
  description: "Your secure cloud storage solution. Fast, minimal, and built for personal use with advanced authentication and recovery features.",
  keywords: "cloud storage, file sharing, personal drive, secure storage, authentication, file management",
  authors: [{ name: "Gaurav" }],
  creator: "Gaurav",
  publisher: "Gaurav",
  robots: "noindex, nofollow", // Since this is for personal use
  openGraph: {
    title: "Gaurav's Personal Drive",
    description: "Secure cloud storage solution with advanced authentication",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Gaurav's Personal Drive",
    description: "Secure cloud storage solution with advanced authentication",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Personal Drive" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>
            </div>
            <Toaster
              position="top-right"
              expand={false}
              richColors
              closeButton
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
