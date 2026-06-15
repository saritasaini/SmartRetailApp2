import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompanyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore(state => state.signOut);
  const profile = useAuthStore(state => state.profile);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = profile?.shop_name || 'SmartRetails';
    return () => {
      document.title = 'SmartRetails';
    };
  }, [profile?.shop_name]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/company', icon: 'fa-th-large', color: 'text-strawberry-400', bg: 'bg-strawberry-50' },
    { name: 'Products', path: '/company/products', icon: 'fa-box-open', color: 'text-orange-400', bg: 'bg-orange-50' },
    { name: 'Orders', path: '/company/orders', icon: 'fa-shopping-cart', color: 'text-blue-400', bg: 'bg-blue-50' },
    { name: 'Customers', path: '/company/customers', icon: 'fa-users', color: 'text-purple-400', bg: 'bg-purple-50' },
    { name: 'Payments', path: '/company/payments', icon: 'fa-credit-card', color: 'text-green-400', bg: 'bg-green-50' },
  ];

  const systemItems = [
    { name: 'Logs', path: '/company/logs', icon: 'fa-file-alt', color: 'text-gray-500', bg: 'bg-gray-100' },
    { name: 'Settings', path: '/company/settings', icon: 'fa-cog', color: 'text-gray-500', bg: 'bg-gray-100' },
  ];

  return (
    <>
      {/* Background Floating Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="floating-shape w-72 h-72 bg-strawberry-400 top-20 -left-20" style={{ animationDelay: '0s' }}></div>
        <div className="floating-shape w-96 h-96 bg-mint-400 bottom-20 -right-20" style={{ animationDelay: '5s' }}></div>
        <div className="floating-shape w-48 h-48 bg-chocolate-400 top-1/2 left-1/3" style={{ animationDelay: '10s' }}></div>
      </div>

      <div className="flex min-h-screen relative z-10">
        
        {/* Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar} 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside 
          className={`w-72 bg-white/90 backdrop-blur-xl border-r border-gray-100 flex flex-col fixed h-full z-50 transition-transform duration-300 lg:relative ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Logo */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-strawberry-400 to-strawberry-600 flex items-center justify-center shadow-lg shadow-strawberry-400/30">
                <i className="fas fa-ice-cream text-white text-xl"></i>
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-gradient">{profile?.shop_name || 'Mahadev'}</h1>
                <p className="text-xs text-gray-400 font-medium tracking-wider">ICE CREAM PARLOR</p>
              </div>
            </div>
          </div>
          
          {/* User Profile Mini */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cream-50 to-cream-100 border border-cream-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-strawberry-300 to-strawberry-500 flex items-center justify-center text-white font-bold text-sm uppercase">
                {profile?.shop_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{profile?.shop_name || 'Admin User'}</p>
                <p className="text-xs text-gray-400">Store Manager</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-mint-400 notification-dot"></div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
            
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name}
                  to={item.path} 
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'active text-strawberry-600 bg-gray-50/50' : 'text-gray-600 hover:text-strawberry-600 hover:bg-gray-50/50'}`}
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <i className={`fas ${item.icon} ${item.color}`}></i>
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">System</p>
            
            {systemItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name}
                  to={item.path} 
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'active text-strawberry-600 bg-gray-50/50' : 'text-gray-600 hover:text-strawberry-600 hover:bg-gray-50/50'}`}
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <i className={`fas ${item.icon} ${item.color}`}></i>
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <i className="fas fa-sign-out-alt text-red-400"></i>
              </div>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden w-full max-w-[100vw]">
          
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="lg:hidden w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                  <i className="fas fa-bars"></i>
                </button>
                <div>
                  <h2 className="font-display font-bold text-xl text-gray-800 capitalize">
                    {location.pathname.split('/').pop() || 'Dashboard'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Welcome to your administrative dashboard.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search */}
                <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus-within:border-strawberry-300 focus-within:bg-white transition-all search-input">
                  <i className="fas fa-search text-gray-400 mr-3"></i>
                  <input type="text" placeholder="Search orders, products..." className="bg-transparent outline-none text-sm w-48 placeholder-gray-400" />
                  <kbd className="ml-3 text-xs bg-white px-2 py-0.5 rounded border text-gray-400">Ctrl+K</kbd>
                </div>
                
                {/* Notifications */}
                <button className="relative w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                  <i className="fas fa-bell"></i>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-strawberry-500 notification-dot"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
