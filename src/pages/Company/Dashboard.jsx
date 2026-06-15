import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Users,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function CompanyDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingDeliveries: 0,
    outstanding: 0,
    revenue: 0,
    revenueGrowth: 0, // Mocked for now
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(state => state.profile);

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
        
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'out_for_delivery').length;
        
        const deliveredCount = orders.filter(o => o.status === 'delivered').length;
        const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
        const outForDeliveryCount = orders.filter(o => o.status === 'out_for_delivery').length;
        const successfulOrders = orders.filter(o => o.status !== 'cancelled').length;
        
        setStats({
          totalOrders: orders.length,
          pendingDeliveries: pending,
          revenue: totalRev,
          outstanding: totalRev - totalPaid,
          revenueGrowth: 12.5, // Mock growth percentage
          
          revenueSubtext: `From ${successfulOrders} successful orders`,
          outstandingSubtext: `Uncollected payments`,
          ordersSubtext: `${deliveredCount} delivered, ${cancelledCount} cancelled`,
          pendingSubtext: `${outForDeliveryCount} out for delivery`
        });

        setRecentOrders(orders.slice(0, 4));

        // Calculate top customers
        const customerTotals = {};
        orders.forEach(o => {
          if (o.status !== 'cancelled' && o.profiles?.shop_name) {
            customerTotals[o.profiles.shop_name] = (customerTotals[o.profiles.shop_name] || 0) + Number(o.total_amount);
          }
        });
        
        const sortedCustomers = Object.entries(customerTotals)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 4);
          
        setTopCustomers(sortedCustomers);

        // Generate Chart Data (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const cData = last7Days.map(date => {
          const dayOrders = orders.filter(o => o.status !== 'cancelled' && o.created_at.startsWith(date));
          const dayTotal = dayOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
          return {
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            sales: dayTotal
          };
        });

        setChartData(cData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, subtext: stats.revenueSubtext, icon: TrendingUp, color: "text-brand-pistachio", bg: "bg-brand-pistachio/10", trend: "+12.5%" },
    { title: "Outstanding", value: `₹${stats.outstanding.toLocaleString()}`, subtext: stats.outstandingSubtext, icon: AlertTriangle, color: "text-brand-berry", bg: "bg-brand-berry/10", trend: null },
    { title: "Total Orders", value: stats.totalOrders, subtext: stats.ordersSubtext, icon: ShoppingCart, color: "text-brand-caramel", bg: "bg-brand-caramel/10", trend: "+5%" },
    { title: "Pending Deliveries", value: stats.pendingDeliveries, subtext: stats.pendingSubtext, icon: Package, color: "text-brand-honey", bg: "bg-brand-honey/10", trend: null },
  ];

  const quickActions = [
    { name: 'Add Product', icon: Plus, path: '/company/products', color: 'bg-brand-caramel' },
    { name: 'Approve Retailers', icon: Users, path: '/company/customers', color: 'bg-brand-pistachio' },
    { name: 'Verify Payments', icon: FileText, path: '/company/payments', color: 'bg-brand-honey' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border-light p-3 rounded-lg shadow-xl">
          <p className="text-text-secondary text-xs mb-1">{label}</p>
          <p className="text-brand-caramel font-bold">₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">
            Welcome back, {profile?.shop_name || 'Admin'} 👋
          </h1>
          <p className="text-text-secondary">Here's what's happening with your business today.</p>
        </div>
        
        {/* Quick Actions Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {quickActions.map(action => (
            <Link key={action.name} to={action.path}>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${action.color} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-black/10`}
              >
                <action.icon size={16} />
                {action.name}
              </motion.button>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions Mobile */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {quickActions.map(action => (
          <Link key={action.name} to={action.path} className="flex-shrink-0">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className={`${action.color} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-black/10`}
            >
              <action.icon size={16} />
              {action.name}
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard hover className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon size={64} className={stat.color} />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shadow-inner`}>
                    <Icon size={20} />
                  </div>
                  {stat.trend && (
                    <span className="flex items-center gap-1 text-xs font-bold text-brand-pistachio bg-brand-pistachio/10 px-2 py-1 rounded-full">
                      <TrendingUp size={12} /> {stat.trend}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-text-primary tracking-tight mb-1">
                    {loading ? "..." : stat.value}
                  </h3>
                  <p className="text-sm text-text-secondary font-medium">{stat.title}</p>
                  {stat.subtext && !loading && (
                    <p className="text-xs text-text-secondary/70 mt-1 border-t border-border-light/50 pt-1">
                      {stat.subtext}
                    </p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Chart & Orders) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="h-[350px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Revenue Overview</h2>
                  <p className="text-xs text-text-secondary">Last 7 days performance</p>
                </div>
              </div>
              
              <div className="flex-1 w-full -ml-4">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center text-text-secondary">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#DC2626" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-text-primary">Recent Orders</h2>
                <Link to="/company/orders" className="text-brand-caramel text-sm font-medium hover:underline flex items-center">
                  View All <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-light text-text-secondary">
                      <th className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider">Customer</th>
                      <th className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider">Amount</th>
                      <th className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-text-secondary text-sm">Loading...</td>
                      </tr>
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-text-secondary text-sm">No recent orders.</td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-border-light/30 last:border-0 hover:bg-bg-primary/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-text-primary">{order.profiles?.shop_name || 'Unknown'}</span>
                              <span className="text-xs text-text-secondary">#{order.id.slice(0, 6).toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm font-bold text-text-primary">₹{order.total_amount}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'delivered' ? 'bg-brand-pistachio/10 text-brand-pistachio border border-brand-pistachio/20' :
                              order.status === 'cancelled' ? 'bg-brand-berry/10 text-brand-berry border border-brand-berry/20' :
                              order.status === 'out_for_delivery' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              'bg-brand-honey/10 text-brand-honey border border-brand-honey/20'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
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

        {/* Right Column (Top Customers & Activity) */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-text-primary">Top Customers</h2>
                <div className="p-1.5 bg-brand-caramel/10 text-brand-caramel rounded-lg">
                  <TrendingUp size={16} />
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-text-secondary">Loading metrics...</div>
              ) : topCustomers.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-secondary">No customer data yet.</div>
              ) : (
                <div className="space-y-4">
                  {topCustomers.map((cust, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/50 border border-border-light hover:border-brand-caramel/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-caramel to-brand-berry flex items-center justify-center text-white font-bold text-xs shadow-lg">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary truncate max-w-[120px]">{cust.name}</p>
                          <p className="text-xs text-text-secondary">Top Buyer</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-pistachio">₹{cust.total.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-border-light">
                <Link to="/company/customers" className="w-full py-2 bg-bg-primary hover:bg-border-light text-text-primary text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  View All Customers <ChevronRight size={16} />
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
