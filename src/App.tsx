import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Installer from './pages/Installer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  // Render proper sub-page component
  const renderRoute = () => {
    switch (currentRoute) {
      case '#/installer':
        return <Installer onNavigate={navigateTo} />;
      case '#/login':
        return <Login onNavigate={navigateTo} />;
      case '#/dashboard':
        return <Dashboard />;
      case '#/':
      default:
        return <Landing onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080a0d] text-slate-200 antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-[#0c0f14]/80 border-slate-900 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigateTo('#/')}
            className="w-5 h-5 rounded bg-red-650 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition"
            title="Go to main landing page"
          >
            <span className="font-extrabold text-[10px] font-mono">F</span>
          </div>
          <div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span 
                  onClick={() => navigateTo('#/')}
                  className="font-bold tracking-tight text-white font-mono text-sm cursor-pointer hover:text-red-400 transition"
                >
                  FIDScript Deployment
                </span>
                <span className="px-1.5 py-0.5 text-[8px] font-bold text-red-500 bg-red-500/10 rounded font-mono">
                  PROD ACTIVE
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-sans tracking-wide leading-none mt-0.5">by Next Mavens</span>
            </div>
          </div>
        </div>

        {/* Dynamic header navbar navigation links */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <button 
            onClick={() => navigateTo('#/')}
            className={`transition ${currentRoute === '#/' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Landing
          </button>
          <button 
            onClick={() => navigateTo('#/installer')}
            className={`transition ${currentRoute === '#/installer' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Installer
          </button>
          <button 
            onClick={() => navigateTo('#/dashboard')}
            className={`transition ${currentRoute === '#/dashboard' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Console Dashboard
          </button>

          {currentRoute !== '#/dashboard' ? (
            <button 
              onClick={() => navigateTo('#/login')}
              className="ml-2 px-3 py-1.5 font-bold text-[10px] text-white bg-red-650 hover:bg-red-600 rounded transition"
            >
              SIGN IN
            </button>
          ) : (
            <button 
              onClick={() => navigateTo('#/')}
              className="ml-2 px-3 py-1.5 font-bold text-[10px] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 rounded transition font-mono"
            >
              SIGN OUT
            </button>
          )}
        </div>
      </header>

      {/* Render the core active screen container */}
      <main className="min-h-[calc(100vh-69px)]">
        {renderRoute()}
      </main>

      {/* Minimalistic operational footer */}
      <footer className="border-t border-slate-900 bg-[#06080b] py-6 text-center text-[10px] font-mono text-slate-500">
        <p>© 2026 FIDScript Deployment by Next Mavens. Built with fullstack express & react nodes.</p>
      </footer>
    </div>
  );
}
