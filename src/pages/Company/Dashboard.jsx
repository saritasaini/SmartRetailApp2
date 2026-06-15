import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function CompanyDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingDeliveries: 0,
    outstanding: 0,
    revenue: 0,
    revenueGrowth: 0, 
    revenueSubtext: '',
    outstandingSubtext: '',
    ordersSubtext: '',
    pendingSubtext: ''
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(state => state.profile);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const user = useAuthStore.getState().user;
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`*, profiles:customer_id (shop_name)`)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

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
          revenueGrowth: 12.5,
          revenueSubtext: `From ${successfulOrders} successful orders`,
          outstandingSubtext: `Uncollected payments`,
          ordersSubtext: `${deliveredCount} delivered, ${cancelledCount} cancelled`,
          pendingSubtext: `${outForDeliveryCount} out for delivery`
        });

        setRecentOrders(orders.slice(0, 5));

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

        const statusCounts = orders.reduce((acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {});
        
        const donutData = [
          { name: 'Delivered', value: statusCounts.delivered || 0, fill: '#4ADE80', dot: 'bg-green-400' },
          { name: 'Confirmed', value: statusCounts.confirmed || 0, fill: '#FBBF24', dot: 'bg-amber-400' },
          { name: 'Pending', value: statusCounts.pending || 0, fill: '#FB923C', dot: 'bg-orange-400' },
          { name: 'Cancelled', value: statusCounts.cancelled || 0, fill: '#9CA3AF', dot: 'bg-gray-400' },
          { name: 'Out for Delivery', value: statusCounts.out_for_delivery || 0, fill: '#60A5FA', dot: 'bg-blue-400' }
        ].filter(d => d.value > 0);
        
        setOrderStatusData(donutData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-gray-500 text-xs mb-1">{label}</p>
          <p className="text-strawberry-500 font-bold">₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-content"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="stat-card glass-card rounded-2xl p-5 border border-white/60">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-400/30 stat-icon">
              <i className="fas fa-rupee-sign text-white text-lg"></i>
            </div>
            <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <i className="fas fa-arrow-up text-[10px]"></i> 12.5%
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
          <h3 className="text-2xl font-display font-bold text-gray-800 revenue-up">
            {loading ? "..." : `₹${stats.revenue.toLocaleString()}`}
          </h3>
          <p className="text-xs text-gray-400 mt-2">{stats.revenueSubtext || 'vs last month'}</p>
        </div>
        
        <div className="stat-card glass-card rounded-2xl p-5 border border-white/60">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-400/30 stat-icon">
              <i className="fas fa-exclamation-triangle text-white text-lg"></i>
            </div>
            <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
              <i className="fas fa-arrow-up text-[10px]"></i> 5.2%
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Outstanding</p>
          <h3 className="text-2xl font-display font-bold text-gray-800">
            {loading ? "..." : `₹${stats.outstanding.toLocaleString()}`}
          </h3>
          <p className="text-xs text-gray-400 mt-2">{stats.outstandingSubtext || 'Uncollected payments'}</p>
        </div>
        
        <div className="stat-card glass-card rounded-2xl p-5 border border-white/60">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-strawberry-400 to-pink-500 flex items-center justify-center shadow-lg shadow-strawberry-400/30 stat-icon">
              <i className="fas fa-shopping-cart text-white text-lg"></i>
            </div>
            <span className="text-xs font-semibold text-strawberry-500 bg-strawberry-50 px-2 py-1 rounded-full flex items-center gap-1">
              <i className="fas fa-arrow-up text-[10px]"></i> 8.1%
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Orders</p>
          <h3 className="text-2xl font-display font-bold text-gray-800">
            {loading ? "..." : stats.totalOrders}
          </h3>
          <p className="text-xs text-gray-400 mt-2">{stats.ordersSubtext || 'This week'}</p>
        </div>
        
        <div className="stat-card glass-card rounded-2xl p-5 border border-white/60">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-400/30 stat-icon">
              <i className="fas fa-box text-white text-lg"></i>
            </div>
            <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
              <i className="fas fa-arrow-down text-[10px]"></i> 2.4%
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Pending Deliveries</p>
          <h3 className="text-2xl font-display font-bold text-gray-800">
            {loading ? "..." : stats.pendingDeliveries}
          </h3>
          <p className="text-xs text-gray-400 mt-2">{stats.pendingSubtext || 'Expected today'}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/60 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-lg text-gray-800">Revenue Analytics</h3>
              <p className="text-sm text-gray-400">Daily revenue for last 7 days</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-strawberry-50 text-strawberry-600 border border-strawberry-200">Daily</button>
            </div>
          </div>
          <div className="h-64 w-full -ml-4 flex-1">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center text-gray-400">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B8A" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#FF6B8A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `₹${value}`} dx={-10}/>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sales" stroke="#FF4D6D" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-6 border border-white/60">
          <div className="mb-4">
            <h3 className="font-display font-bold text-lg text-gray-800">Order Status</h3>
            <p className="text-sm text-gray-400">Distribution by status</p>
          </div>
          <div className="h-48 flex items-center justify-center">
            {loading ? (
              <div className="text-gray-400">Loading chart...</div>
            ) : orderStatusData.length === 0 ? (
              <div className="text-gray-400 text-sm">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {orderStatusData.map((data, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.dot}`}></div>
                  <span className="text-gray-600">{data.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{data.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="glass-card rounded-2xl border border-white/60 overflow-hidden mb-8">
        <div className="p-6 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-gray-800">Recent Orders</h3>
            <p className="text-sm text-gray-400">Latest orders from your shops</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/company/orders" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <i className="fas fa-eye text-xs"></i> View All
            </Link>
            <Link to="/company/products" className="btn-primary text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-plus text-xs"></i> New Product
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Shop Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400 text-sm">Loading orders...</td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400 text-sm">No recent orders found.</td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  let statusBg = 'bg-gray-100';
                  let statusText = 'text-gray-600';
                  let statusBorder = 'border-gray-200';
                  let statusDot = 'bg-gray-500';
                  
                  if (order.status === 'delivered') {
                    statusBg = 'bg-green-50'; statusText = 'text-green-600'; statusBorder = 'border-green-200'; statusDot = 'bg-green-500';
                  } else if (order.status === 'confirmed') {
                    statusBg = 'bg-amber-50'; statusText = 'text-amber-600'; statusBorder = 'border-amber-200'; statusDot = 'bg-amber-500';
                  } else if (order.status === 'pending') {
                    statusBg = 'bg-orange-50'; statusText = 'text-orange-600'; statusBorder = 'border-orange-200'; statusDot = 'bg-orange-500';
                  } else if (order.status === 'out_for_delivery') {
                    statusBg = 'bg-blue-50'; statusText = 'text-blue-600'; statusBorder = 'border-blue-200'; statusDot = 'bg-blue-500';
                  }

                  return (
                    <tr key={order.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-strawberry-50 flex items-center justify-center">
                            <i className="fas fa-hashtag text-strawberry-400 text-xs"></i>
                          </div>
                          <span className="text-sm font-semibold text-strawberry-500">{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                            {order.profiles?.shop_name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{order.profiles?.shop_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">₹{order.total_amount}</td>
                      <td className="px-6 py-4">
                        <span className={`status-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBg} ${statusText} border ${statusBorder}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/company/products" className="glass-card rounded-2xl p-5 border border-white/60 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-strawberry-400 to-pink-500 flex items-center justify-center shadow-lg shadow-strawberry-400/30 group-hover:scale-110 transition-transform">
            <i className="fas fa-plus text-white text-lg"></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Add New Product</h4>
            <p className="text-xs text-gray-400">Expand your inventory</p>
          </div>
        </Link>
        
        <Link to="/company/orders" className="glass-card rounded-2xl p-5 border border-white/60 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-400/30 group-hover:scale-110 transition-transform">
            <i className="fas fa-truck text-white text-lg"></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Manage Deliveries</h4>
            <p className="text-xs text-gray-400">Track pending deliveries</p>
          </div>
        </Link>
        
        <Link to="/company/payments" className="glass-card rounded-2xl p-5 border border-white/60 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-400/30 group-hover:scale-110 transition-transform">
            <i className="fas fa-file-invoice text-white text-lg"></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Verify Payments</h4>
            <p className="text-xs text-gray-400">Check recent transactions</p>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
