import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function CompanyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore(state => state.signOut);
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ products: [], orders: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifContainerRef = useRef(null);

  useEffect(() => {
    document.title = profile?.shop_name || 'SmartRetails';
    return () => {
      document.title = 'SmartRetails';
    };
  }, [profile?.shop_name]);

  // Fetch Notifications (Low Stock & Pending Orders)
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const [stockRes, orderRes] = await Promise.all([
          supabase.from('products').select('id, name, stock_quantity').eq('company_id', user.id).lt('stock_quantity', 50),
          supabase.from('orders').select('id, total_amount, created_at').eq('company_id', user.id).eq('status', 'pending')
        ]);
        
        let notifs = [];
        if (stockRes.data) {
          stockRes.data.forEach(p => {
            notifs.push({
              id: `stock-${p.id}`,
              type: 'stock',
              title: 'Low Stock Alert',
              message: `${p.name} only has ${p.stock_quantity} left.`,
              link: '/company/products',
              time: new Date()
            });
          });
        }
        if (orderRes.data) {
          orderRes.data.forEach(o => {
            notifs.push({
              id: `order-${o.id}`,
              type: 'order',
              title: 'New Pending Order',
              message: `Order #${o.id.substring(0,6)} for ₹${o.total_amount}`,
              link: '/company/orders',
              time: new Date(o.created_at)
            });
          });
        }
        notifs.sort((a, b) => b.time - a.time);
        setNotifications(notifs);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    
    fetchNotifications();
  }, [user]);

  // Ctrl+K Listener & Click Outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search Logic (Debounced)
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults({ products: [], orders: [] });
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = `%${searchQuery}%`;
        const [prodRes, ordRes] = await Promise.all([
          supabase.from('products').select('id, name, price, image_url').eq('company_id', user.id).ilike('name', q).limit(5),
          supabase.from('orders').select('id, total_amount, status').eq('company_id', user.id).ilike('id', q).limit(5)
        ]);

        setSearchResults({
          products: prodRes.data || [],
          orders: ordRes.data || []
        });
      } catch (error) {
        console.error("Search error", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

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

  const navigateTo = (path) => {
    navigate(path);
    setIsSearchOpen(false);
    setIsNotifOpen(false);
    setSearchQuery('');
  };

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
                <div className="relative hidden md:block" ref={searchContainerRef}>
                  <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus-within:border-strawberry-300 focus-within:bg-white transition-all search-input">
                    <i className="fas fa-search text-gray-400 mr-3"></i>
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search orders, products..." 
                      className="bg-transparent outline-none text-sm w-48 placeholder-gray-400" 
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                      onFocus={() => setIsSearchOpen(true)}
                    />
                    <kbd className="ml-3 text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400 shadow-sm font-mono">Ctrl+K</kbd>
                  </div>

                  {/* Search Dropdown */}
                  <AnimatePresence>
                    {isSearchOpen && searchQuery.trim().length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="max-h-96 overflow-y-auto custom-scrollbar py-2">
                          {isSearching ? (
                            <div className="p-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                              <i className="fas fa-spinner fa-spin"></i> Searching...
                            </div>
                          ) : (
                            <>
                              {searchResults.products.length === 0 && searchResults.orders.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400">No results found for "{searchQuery}"</div>
                              ) : (
                                <>
                                  {searchResults.products.length > 0 && (
                                    <div className="mb-2">
                                      <p className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Products</p>
                                      {searchResults.products.map(p => (
                                        <div key={p.id} onClick={() => navigateTo('/company/products')} className="flex items-center gap-3 px-4 py-2 hover:bg-strawberry-50 cursor-pointer transition-colors">
                                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <i className="fas fa-box text-gray-400 text-xs"></i>}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                            <p className="text-xs text-strawberry-500 font-bold">₹{p.price}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {searchResults.orders.length > 0 && (
                                    <div>
                                      <p className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Orders</p>
                                      {searchResults.orders.map(o => (
                                        <div key={o.id} onClick={() => navigateTo('/company/orders')} className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors">
                                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                            <i className="fas fa-shopping-bag text-blue-500 text-xs"></i>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">#{o.id.substring(0,8)}</p>
                                            <p className="text-xs text-gray-500 capitalize">{o.status}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Notifications */}
                <div className="relative" ref={notifContainerRef}>
                  <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-strawberry-300 outline-none"
                  >
                    <i className="fas fa-bell"></i>
                    {notifications.length > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-strawberry-500 border-2 border-white notification-dot"></span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotifOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 origin-top-right"
                      >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                          <h3 className="font-bold text-gray-800">Notifications</h3>
                          <span className="bg-strawberry-100 text-strawberry-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {notifications.length} New
                          </span>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <i className="fas fa-bell-slash text-gray-300 text-2xl"></i>
                              </div>
                              <p className="text-gray-500 font-medium text-sm">You're all caught up!</p>
                              <p className="text-gray-400 text-xs mt-1">No new notifications right now.</p>
                            </div>
                          ) : (
                            <div className="py-2">
                              {notifications.map((notif) => (
                                <div 
                                  key={notif.id}
                                  onClick={() => navigateTo(notif.link)}
                                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex gap-3"
                                >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'stock' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                                    <i className={`fas ${notif.type === 'stock' ? 'fa-exclamation-triangle' : 'fa-shopping-bag'}`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{notif.type === 'stock' ? 'Low Stock Alert' : 'Pending Action'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
