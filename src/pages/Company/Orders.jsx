import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { ShoppingCart, Search, ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import InvoiceModal from '../../components/ui/InvoiceModal';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function OrderStatusPath({ order, onUpdateStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  
  useEffect(() => {
    setSelectedStatus(order.status);
  }, [order.status]);

  const stages = [
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'out_for_delivery', label: 'Out for Delivery' },
    { id: 'delivered', label: 'Delivered' }
  ];

  const currentIndex = stages.findIndex(s => s.id === order.status);
  const selectedIndex = stages.findIndex(s => s.id === selectedStatus);

  if (order.status === 'cancelled') {
    return (
      <div className="w-full bg-red-50 text-red-600 rounded-lg p-3 text-center font-bold text-sm border border-red-200 mt-4">
        This order has been cancelled.
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row items-center gap-4 w-full mt-6 pt-4 border-t border-gray-100">
      <div className="flex flex-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white">
        {stages.map((stage, i) => {
          const isCompleted = currentIndex > i;
          const isActive = currentIndex === i;
          const isSelected = selectedIndex === i;
          
          let bgColor = 'bg-gray-100 text-gray-500 hover:bg-gray-200';
          if (isCompleted) bgColor = 'bg-emerald-500 text-white hover:bg-emerald-600';
          else if (isActive) bgColor = 'bg-blue-600 text-white';
          
          if (isSelected && !isActive && !isCompleted) {
             bgColor = 'bg-blue-50 text-blue-700 font-bold';
          }
          
          const isFirst = i === 0;
          const isLast = i === stages.length - 1;

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStatus(stage.id)}
              className={`relative flex-1 py-2 px-2 sm:px-4 text-[10px] sm:text-xs font-semibold transition-colors focus:outline-none flex items-center justify-center min-w-[70px] sm:min-w-[100px]
                ${bgColor}
              `}
              style={{
                clipPath: isFirst 
                  ? 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
                  : isLast
                  ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)'
                  : 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)',
                marginLeft: isFirst ? '0' : '-9px',
                paddingLeft: isFirst ? '8px' : '18px',
                paddingRight: isLast ? '8px' : '18px'
              }}
            >
              {isCompleted ? (
                <Check size={14} className="shrink-0" />
              ) : (
                <span className="truncate">{stage.label}</span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Action Button */}
      {selectedStatus !== order.status ? (
        <Button 
          onClick={() => onUpdateStatus(selectedStatus)}
          className="shrink-0 py-2 w-full xl:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Check size={16} className="mr-2" /> Mark as Current
        </Button>
      ) : currentIndex < stages.length - 1 ? (
        <Button 
          onClick={() => onUpdateStatus(stages[currentIndex + 1].id)}
          className="shrink-0 py-2 w-full xl:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Check size={16} className="mr-2" /> Mark {stages[currentIndex + 1].label}
        </Button>
      ) : (
         <div className="shrink-0 py-2 px-4 w-full xl:w-auto bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center">
            <Check size={16} className="mr-2" /> Completed
         </div>
      )}
    </div>
  );
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [fetchError, setFetchError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const user = useAuthStore.getState().user;
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (shop_name, owner_name, phone, address),
          order_items (
            quantity,
            price_at_order,
            products (name, image_url, unit)
          )
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(error.message || JSON.stringify(error));
        throw error;
      }
      if (data) {
        setOrders(data);
        setFetchError(null);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (!fetchError) setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Set up Realtime subscription
    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    // Optimistic UI Update
    const originalOrders = [...orders];
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();
        
      if (error) {
        throw error;
      }
      
      // If data is empty, it means RLS blocked the update!
      if (!data || data.length === 0) {
        throw new Error("Aapke paas orders update karne ki permission nahi hai. Please SQL Editor me 'FOR ALL' wali policy run karein.");
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed: ' + (error.message || 'Unknown error'));
      // Revert if failed
      setOrders(originalOrders);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.profiles?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (dateFilter === 'today') {
        matchesDate = orderDate.getTime() === today.getTime();
      } else if (dateFilter === 'yesterday') {
        matchesDate = orderDate.getTime() === yesterday.getTime();
      }
    }
    
    let matchesAmount = true;
    if (amountFilter === 'under_500') matchesAmount = order.total_amount < 500;
    else if (amountFilter === '500_to_2000') matchesAmount = order.total_amount >= 500 && order.total_amount <= 2000;
    else if (amountFilter === 'over_2000') matchesAmount = order.total_amount > 2000;
    
    return matchesSearch && matchesStatus && matchesDate && matchesAmount;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'amount_high') return b.total_amount - a.total_amount;
    if (sortBy === 'amount_low') return a.total_amount - b.total_amount;
    return 0;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20';
      case 'confirmed': return 'bg-brand-berry/10 text-brand-berry border-brand-berry/20'; // previously cancelled theme
      case 'out_for_delivery': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'; // previously confirmed theme, now purely red
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-brand-honey/10 text-brand-honey border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            Order Management
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            View and manage customer orders in real-time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col gap-4">
          {/* Status Tabs */}
          <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide border-b border-border-light/50">
            {['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? 'bg-brand-caramel/10 text-brand-caramel border border-brand-caramel/20' 
                    : 'text-text-secondary hover:bg-white/50'
                }`}
              >
                {status === 'all' ? 'All Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
          
          {/* Additional Filters */}
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
            <div className="relative w-full sm:w-auto sm:min-w-[250px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="text"
                placeholder="Search Order ID, Shop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-color bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full lg:w-auto">
              <div className="relative col-span-2 sm:col-span-1 w-full">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-3 pr-8 sm:px-4 py-2 rounded-lg border border-border-color bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 transition-all text-sm font-medium cursor-pointer appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={16} />
              </div>

              <div className="relative col-span-1 w-full">
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full pl-2 pr-5 sm:px-4 py-2 rounded-lg border border-border-color bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 transition-all text-xs sm:text-sm font-medium cursor-pointer text-ellipsis appearance-none"
                >
                  <option value="all">All Amounts</option>
                  <option value="under_500">Under ₹500</option>
                  <option value="500_to_2000">₹500 - ₹2000</option>
                  <option value="over_2000">Over ₹2000</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={14} />
              </div>

              <div className="relative col-span-1 w-full">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-2 pr-5 sm:px-4 py-2 rounded-lg border border-border-color bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 transition-all text-xs sm:text-sm font-medium cursor-pointer text-ellipsis appearance-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">High to Low</option>
                  <option value="amount_low">Low to High</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        {fetchError ? (
          <div className="text-center py-12 text-brand-berry bg-brand-berry/10 rounded-xl border border-brand-berry/20">
            <h3 className="font-bold text-lg">Error loading orders</h3>
            <p className="font-mono text-sm mt-2">{fetchError}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-text-secondary">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">No orders found matching your criteria.</div>
        ) : (
          filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
              style={{ zIndex: openDropdownId === order.id ? 50 : 1 }}
            >
              <GlassCard hover className="p-0">
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                  
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-brand-caramel font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-text-secondary text-sm">{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">{order.profiles?.shop_name || 'Unknown Shop'}</h3>
                    <p className="text-text-secondary text-sm mb-3">
                      {order.profiles?.owner_name} • {order.profiles?.phone}
                    </p>
                    
                    {/* Items Preview */}
                    <p className="text-sm text-text-secondary mt-3 line-clamp-2 leading-relaxed">
                      <span className="font-medium text-text-primary">Items: </span>
                      {order.order_items?.slice(0, 3).map(item => `${item.quantity}x ${item.products?.name}`).join(', ')}
                      {order.order_items?.length > 3 && ` + ${order.order_items.length - 3} more`}
                    </p>
                  </div>

                  {/* Pricing and Actions */}
                  <div className="flex flex-col w-full lg:w-auto gap-4 mt-2 lg:mt-0 pt-4 lg:pt-0 border-t border-border-light/50 lg:border-t-0">
                    <div className="flex flex-row justify-between items-center gap-4 w-full">
                      <div className="text-left">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-0.5">Total Amount</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold text-brand-caramel">₹{order.total_amount}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                            order.payment_method === 'cod' ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' :
                            order.payment_method === 'upi' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            'bg-text-secondary/10 text-text-secondary border-border-light'
                          }`}>
                            {order.payment_method === 'cod' ? 'COD' : order.payment_method === 'upi' ? 'UPI' : 'Pay Later'}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="secondary" 
                        className="py-1.5 px-4 text-sm whitespace-nowrap bg-bg-tertiary hover:bg-bg-secondary"
                        onClick={() => setSelectedInvoice(order)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  </div>

                  {/* Order Status Path */}
                  <OrderStatusPath 
                    order={order} 
                    onUpdateStatus={(newStatus) => updateOrderStatus(order.id, newStatus)} 
                  />
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      {selectedInvoice && (
        <InvoiceModal 
          order={selectedInvoice} 
          profile={selectedInvoice.profiles} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
}
