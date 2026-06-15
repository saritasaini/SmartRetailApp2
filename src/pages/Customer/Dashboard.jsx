import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { ShoppingBag, Search, Clock, ArrowRight, Wallet, ChevronRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CustomerDashboard() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({ outstanding: 0, total: 0, pending: 0, delivered: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('Our Catalog');
  const [companyPhone, setCompanyPhone] = useState(null);

  useEffect(() => {
    async function fetchCompanyName() {
      if (profile?.company_id) {
        const { data } = await supabase
          .from('profiles')
          .select('shop_name, phone')
          .eq('id', profile.company_id)
          .single();
        if (data?.shop_name) {
          setCompanyName(data.shop_name);
          setCompanyPhone(data.phone);
        }
      }
    }
    fetchCompanyName();
  }, [profile?.company_id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // Fetch Recent Orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (orders) {
          setRecentOrders(orders.slice(0, 3));
          
          const totalBilledLedger = orders
            .filter(o => o.payment_method === 'ledger' && o.status === 'delivered')
            .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
            
          const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'out_for_delivery').length;
          const delivered = orders.filter(o => o.status === 'delivered').length;

          const { data: payments } = await supabase
            .from('payments')
            .select('amount, order_id, status')
            .eq('customer_id', user.id)
            .eq('status', 'verified');
            
          const totalPaidLedger = (payments || [])
            .filter(p => p.order_id === null)
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
          
          setStats({
            outstanding: totalBilledLedger - totalPaidLedger,
            totalSpent: totalBilledLedger,
            total: orders.length,
            pending: pending,
            delivered: delivered
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="bg-gradient-to-br from-brand-caramel/30 via-bg-primary to-brand-frosted/20 border-brand-caramel/40 relative overflow-hidden p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-block px-3 py-1 bg-brand-caramel/20 border border-brand-caramel/30 text-brand-caramel text-xs font-bold rounded-full mb-3 tracking-wide">
                B2B PARTNER
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-caramel to-[#F4D03F] mb-2 tracking-tight">
                Welcome to {companyName}
              </h1>
              <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
                Your wholesale portal for premium ice cream products. Restock your inventory instantly and track your ledger seamlessly.
              </p>
            </div>
            <div className="mt-4 md:mt-0 relative z-10">
              <Link to="/customer/catalog">
                <Button className="whitespace-nowrap px-6 py-3 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all">
                  Browse Catalog <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-caramel/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand-frosted/10 rounded-full blur-[60px] pointer-events-none"></div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Khata / Ledger Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="border-brand-berry/20 bg-gradient-to-b from-bg-primary to-brand-berry/5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Outstanding Balance</h3>
                <div className="w-8 h-8 rounded-full bg-brand-berry/10 text-brand-berry flex items-center justify-center">
                  <Wallet size={16} />
                </div>
              </div>
              <p className="text-3xl font-black text-text-primary mb-4">
                {loading ? '...' : `₹${stats.outstanding.toLocaleString()}`}
              </p>
              
              <Link to="/customer/payments">
                <Button variant="outline" className="w-full text-xs py-2 border-border-light hover:border-brand-caramel hover:text-brand-caramel">
                  View Ledger & Pay
                </Button>
              </Link>
            </GlassCard>
          </motion.div>

          {/* Order Stats */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-tertiary border border-border-light rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-text-primary mb-0.5">{loading ? '-' : stats.total}</p>
                <p className="text-[10px] text-text-secondary uppercase font-semibold">Total</p>
              </div>
              <div className="bg-brand-honey/5 border border-brand-honey/20 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-brand-honey mb-0.5">{loading ? '-' : stats.pending}</p>
                <p className="text-[10px] text-brand-honey/80 uppercase font-semibold">Pending</p>
              </div>
              <div className="bg-brand-pistachio/5 border border-brand-pistachio/20 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-brand-pistachio mb-0.5">{loading ? '-' : stats.delivered}</p>
                <p className="text-[10px] text-brand-pistachio/80 uppercase font-semibold">Delivered</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3 pt-2">
            <Link to="/customer/orders" className="block h-full">
              <GlassCard hover className="h-full flex flex-col items-center justify-center text-center p-4 border-border-light hover:border-brand-caramel transition-colors group">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center mb-2 group-hover:bg-brand-caramel/10 group-hover:text-brand-caramel transition-all">
                  <ShoppingBag size={18} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">My Orders</h3>
              </GlassCard>
            </Link>
            <Link to="/customer/profile" className="block h-full">
              <GlassCard hover className="h-full flex flex-col items-center justify-center text-center p-4 border-border-light hover:border-brand-caramel transition-colors group">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center mb-2 group-hover:bg-brand-caramel/10 group-hover:text-brand-caramel transition-all">
                  <Clock size={18} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Profile</h3>
              </GlassCard>
            </Link>
          </motion.div>
        </div>

        {/* Right Column: Recent Orders */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="h-full">
            <GlassCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-light/50">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ShoppingBag className="text-brand-caramel" size={20} /> Recent Orders
                </h2>
                <Link to="/customer/orders" className="text-sm text-brand-caramel hover:underline font-semibold flex items-center">
                  View All <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="flex-1">
                {loading ? (
                  <div className="h-full flex items-center justify-center py-10">
                    <div className="animate-spin w-8 h-8 border-2 border-brand-caramel border-t-transparent rounded-full"></div>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-12 bg-bg-tertiary/30 rounded-xl border border-border-light border-dashed">
                    <ShoppingBag className="mx-auto text-text-muted mb-3 opacity-50" size={40} />
                    <h3 className="text-base font-bold text-text-primary">No recent orders</h3>
                    <p className="text-sm text-text-secondary mt-1">Start ordering to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map(order => (
                      <Link key={order.id} to="/customer/orders" className="block">
                        <div className="p-4 rounded-xl border border-border-light/50 bg-bg-tertiary/20 hover:bg-bg-tertiary hover:border-brand-caramel/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-text-secondary">#{order.id.slice(0,8).toUpperCase()}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                order.status === 'delivered' ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' :
                                order.status === 'cancelled' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/20' :
                                'bg-brand-honey/10 text-brand-honey border-yellow-500/20'
                              }`}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary">
                              {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <span className="text-lg font-black text-text-primary">₹{order.total_amount}</span>
                            <div className="w-8 h-8 rounded-full bg-bg-primary border border-border-light flex items-center justify-center text-text-secondary group-hover:bg-brand-caramel group-hover:text-white group-hover:border-brand-caramel transition-all">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

      </div>

      {/* WhatsApp Floating Action Button */}
      {companyPhone && (
        <a 
          href={`https://wa.me/91${companyPhone.replace(/\\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-[0_10px_25px_rgba(34,197,94,0.4)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.5)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
          title="Chat with Support"
        >
          <MessageCircle size={28} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap pl-0 group-hover:pl-2 font-bold">
            Chat with us
          </span>
        </a>
      )}
    </div>
  );
}
