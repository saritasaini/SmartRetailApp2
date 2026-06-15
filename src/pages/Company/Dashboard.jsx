import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CompanyDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingDeliveries: 0,
    outstanding: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const user = useAuthStore.getState().user;
      
      // Fetch Orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (shop_name)
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch Payments for Outstanding Calculation
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', user.id)
        .eq('status', 'verified');

      if (orders) {
        const totalRev = orders
          .filter(o => o.status !== 'cancelled')
          .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
          
        const totalPaid = (payments || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
        
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        
        setStats({
          totalOrders: orders.length,
          pendingDeliveries: pending,
          revenue: totalRev,
          outstanding: totalRev - totalPaid
        });

        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: "text-brand-pistachio", bg: "bg-green-400/10" },
    { title: "Outstanding Receivables", value: `₹${stats.outstanding.toLocaleString()}`, icon: AlertTriangle, color: "text-brand-berry", bg: "bg-brand-berry/10" },
    { title: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-brand-caramel", bg: "bg-brand-caramel/10" },
    { title: "Pending Deliveries", value: stats.pendingDeliveries, icon: Package, color: "text-brand-honey", bg: "bg-brand-honey/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Overview</h1>
        <p className="text-text-secondary">Welcome to your administrative dashboard.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard hover className="flex items-center gap-4">
                <div className={`p-4 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-text-primary">
                    {loading ? "..." : stat.value}
                  </h3>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Recent Orders</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap w-12">S.No.</th>
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap">Order ID</th>
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap">Shop Name</th>
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap">Amount</th>
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap">Status</th>
                  <th className="pb-3 px-4 text-sm font-medium text-text-secondary whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-text-secondary">Loading orders...</td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-text-secondary">No recent orders found.</td>
                  </tr>
                ) : (
                  recentOrders.map((order, index) => (
                    <tr key={order.id} className="border-b border-border-light/50 hover:bg-bg-primary/5 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-text-secondary">{index + 1}</td>
                      <td className="py-4 px-4 text-sm text-brand-caramel whitespace-nowrap">{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-4 px-4 text-sm text-text-primary whitespace-nowrap">{order.profiles?.shop_name || 'Unknown'}</td>
                      <td className="py-4 px-4 text-sm font-medium text-text-primary whitespace-nowrap">₹{order.total_amount}</td>
                      <td className="py-4 px-4 text-sm whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' ? 'bg-brand-pistachio/10 text-brand-pistachio' :
                          order.status === 'cancelled' ? 'bg-brand-berry/10 text-brand-berry' :
                          order.status === 'out_for_delivery' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-brand-honey/10 text-brand-honey'
                        }`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-text-secondary whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
