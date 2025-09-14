import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
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
  description: "Secure personal drive and file manager by Gaurav — fast uploads, private links, and anywhere access.",
  keywords: ["personal drive", "cloud storage", "file manager", "uploads", "private links", "Gaurav"],
  authors: [{ name: "Gaurav" }],
  creator: "Gaurav",
  publisher: "Gaurav",
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
  themeColor: "#0fb9b1",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0fb9b1" },
    { media: "(prefers-color-scheme: dark)", color: "#0fb9b1" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/icon-32x32.png" as="image" type="image/png" />
        <meta name="theme-color" content="#0fb9b1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gaurav's Personal Drive" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "name": "Gaurav's Personal Drive",
                  "url": typeof window !== 'undefined' ? window.location.origin : 'https://gauravs-personal-drive.vercel.app',
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": (typeof window !== 'undefined' ? window.location.origin : 'https://gauravs-personal-drive.vercel.app') + "/search?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "name": "Gaurav's Personal Drive",
                  "url": typeof window !== 'undefined' ? window.location.origin : 'https://gauravs-personal-drive.vercel.app',
                  "logo": (typeof window !== 'undefined' ? window.location.origin : 'https://gauravs-personal-drive.vercel.app') + "/icon-512x512.png"
                }
              ]
            })
          }}
        />
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
            <NotificationProvider>
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
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
