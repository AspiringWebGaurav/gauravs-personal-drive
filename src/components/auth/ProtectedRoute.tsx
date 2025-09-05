'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { LoginButton } from './LoginButton';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}

const FeatureCard = ({ icon, title, description, color, delay }: FeatureCardProps) => (
  <div
    className={`glass-feature-card text-center stagger-in hover:scale-105 transition-transform duration-300`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${color} flex items-center justify-center text-2xl animate-bounce`}
         style={{ animationDelay: `${delay + 200}ms` }}>
      {icon}
    </div>
    <h3 className="feature-title text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="feature-description text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen glass-hero flex items-center justify-center">
    <div className="text-center fade-in-up">
      <div className="relative mb-6">
        <div className="w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
          <div className="absolute inset-2 border-4 border-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute inset-4 border-4 border-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
          <div className="absolute inset-6 w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="glass-card px-6 py-4 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Loading GPD
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Preparing your secure cloud experience...
        </p>
      </div>
    </div>
  </div>
);

const FloatingElements = () => (
  <>
    {/* Floating decoration elements */}
    <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '1s' }}></div>
    <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '2s' }}></div>
    <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '3s' }}></div>
    <div className="absolute bottom-20 right-10 w-2.5 h-2.5 bg-blue-300 rounded-full animate-pulse opacity-30" style={{ animationDelay: '1.5s' }}></div>
  </>
);

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen glass-hero relative overflow-hidden">
        <FloatingElements />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="container-max relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          
          {/* Desktop Split Layout */}
          <div className="hidden lg:grid desktop-split max-w-7xl w-full">
            
            {/* Hero Section - Left Side */}
            <div className={`space-y-8 fade-in-up ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              <div className="space-y-6">
                {/* Brand */}
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">G</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {process.env.NEXT_PUBLIC_APP_NAME || "Gaurav's Personal Drive"}
                    </h1>
                  </div>
                </div>

                {/* Hero Content */}
                <div className="space-y-6">
                  <h2 className="hero-title">
                    Your Private Cloud,
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      Reimagined
                    </span>
                  </h2>
                  
                  <p className="hero-subtitle max-w-md">
                    Secure storage with Secret Vault encryption, unlimited space, and seamless sharing. Your files, your way.
                  </p>

                  {/* Trust Indicators */}
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>End-to-end encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <span>Unlimited storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <span>Global access</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-8">
                    <LoginButton />
                    
                    {/* Privacy Notice */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 max-w-sm">
                      By continuing, you agree to our secure authentication. We never store your Google password.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Showcase - Right Side */}
            <div className={`slide-in-right ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              <div className="grid grid-cols-2 gap-6 max-w-lg">
                <FeatureCard
                  icon="🔒"
                  title="Google Sign-in Only"
                  description="Secure authentication with Google's trusted OAuth system"
                  color="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20"
                  delay={100}
                />
                <FeatureCard
                  icon="🚀"
                  title="Unlimited Storage"
                  description="Store files without worrying about space limits"
                  color="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20"
                  delay={200}
                />
                <FeatureCard
                  icon="🔐"
                  title="Secret Vault"
                  description="End-to-end encryption for your most sensitive files"
                  color="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20"
                  delay={300}
                />
                <FeatureCard
                  icon="📤"
                  title="One-tap Sharing"
                  description="Create instant secure links for seamless collaboration"
                  color="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20"
                  delay={400}
                />
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden w-full max-w-md mx-auto">
            <div className={`text-center space-y-8 fade-in-up ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              
              {/* Mobile Brand */}
              <div className="flex items-center justify-center space-x-3 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-2xl">G</span>
                </div>
              </div>

              {/* Mobile Hero */}
              <div className="space-y-6">
                <h1 className="hero-title text-center">
                  Your Private Cloud,
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Reimagined
                  </span>
                </h1>
                
                <p className="hero-subtitle text-center">
                  Secure storage with premium features, designed for your privacy and productivity.
                </p>

                {/* Mobile Features - Stacked */}
                <div className="mobile-stack space-y-4">
                  <FeatureCard
                    icon="🔒"
                    title="Google Sign-in Only"
                    description="Secure authentication you can trust"
                    color="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20"
                    delay={100}
                  />
                  <FeatureCard
                    icon="🚀"
                    title="Unlimited Storage"
                    description="No limits on your file storage"
                    color="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20"
                    delay={200}
                  />
                  <FeatureCard
                    icon="🔐"
                    title="Secret Vault"
                    description="End-to-end encryption for sensitive files"
                    color="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20"
                    delay={300}
                  />
                  <FeatureCard
                    icon="📤"
                    title="One-tap Sharing"
                    description="Instant secure links for sharing"
                    color="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20"
                    delay={400}
                  />
                </div>

                {/* Mobile CTA */}
                <div className="pt-6">
                  <LoginButton />
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Secure authentication powered by Google
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
      </div>
    );
  }

  return <>{children}</>;
};