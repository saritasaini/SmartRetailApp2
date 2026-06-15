import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { ShoppingBag, Package, ChevronRight, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvoiceModal from '../../components/ui/InvoiceModal';

export default function MyOrders() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity, price_at_order,
            products (name, image_url, unit)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    // Hide modal
    setCancellingOrderId(null);

    const originalOrders = [...orders];
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: 'cancelled' } : order));

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Aapke paas order cancel karne ki permission nahi hai. Kripya admin se 'Customer UPDATE Policy' on karne ko kahein.");
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order: ' + (err.message || 'Unknown error'));
      setOrders(originalOrders);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20';
      case 'confirmed': return 'bg-brand-berry/10 text-brand-berry border-brand-berry/20';
      case 'out_for_delivery': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-brand-honey/10 text-brand-honey border-yellow-500/20'; // pending
    }
  };

  const getStatusText = (status) => {
    if (status === 'out_for_delivery') return 'Out for Delivery';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">My Orders</h1>
          <p className="text-sm text-text-secondary">Track and view your past orders.</p>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-brand-caramel text-white shadow-md' 
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary border border-border-light'
              }`}
            >
              {status === 'all' ? 'All Orders' : getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-brand-caramel" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <GlassCard className="text-center py-16 flex flex-col items-center">
          <ShoppingBag size={48} className="text-text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-text-primary mb-2">No orders yet</h2>
          <p className="text-sm text-text-secondary mb-6">You haven't placed any orders with us yet.</p>
          <Link to="/customer/catalog">
            <Button>Start Shopping</Button>
          </Link>
        </GlassCard>
      ) : filteredOrders.length === 0 ? (
        <GlassCard className="text-center py-16 flex flex-col items-center">
          <ShoppingBag size={48} className="text-text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-text-primary mb-2">No orders found</h2>
          <p className="text-sm text-text-secondary mb-6">We couldn't find any {statusFilter} orders.</p>
          <Button onClick={() => setStatusFilter('all')} variant="outline">View All Orders</Button>
        </GlassCard>
      ) : (
        <div className="space-y-4 print:hidden">
          {filteredOrders.map((order) => (
            <GlassCard key={order.id} className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border-light bg-bg-tertiary/50 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs font-bold text-text-secondary">
                      ORDER #{order.id.split('-')[0].toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-xs text-text-secondary mb-0.5">Total Amount</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-brand-caramel">₹{order.total_amount}</p>
                  </div>
                  <span className={`mt-1 text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                    order.payment_method === 'cod' ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' :
                    order.payment_method === 'upi' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-text-secondary/10 text-text-secondary border-border-light'
                  }`}>
                    {order.payment_method === 'cod' ? 'COD' : order.payment_method === 'upi' ? 'UPI' : 'Pay Later'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-xs font-bold text-text-secondary uppercase mb-3">Items Ordered</h4>
                <div className="space-y-3">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-bg-tertiary rounded flex items-center justify-center shrink-0 overflow-hidden">
                        {item.products?.image_url ? (
                          <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{item.products?.name}</p>
                        <p className="text-xs text-text-secondary">
                          {item.quantity} x ₹{item.price_at_order} (per {item.products?.unit})
                        </p>
                      </div>
                      <div className="text-right font-medium text-sm text-text-primary">
                        ₹{(item.quantity * item.price_at_order).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-3 bg-bg-primary border-t border-border-light flex justify-between items-center">
                <div>
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => setCancellingOrderId(order.id)}
                      className="text-xs py-1.5 px-3 rounded-lg font-bold bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
                <Button variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-2" onClick={() => setSelectedInvoice(order)}>
                  <FileText size={14} /> View Invoice
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal 
          order={selectedInvoice} 
          profile={profile || user.user_metadata || { shop_name: 'Your Shop', owner_name: 'Owner', address: 'Address', phone: 'Phone' }} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-secondary border border-border-light rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Cancel Order</h3>
                <p className="text-sm text-text-secondary">Are you sure you want to cancel this order? This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <Button 
                variant="outline" 
                className="py-2" 
                onClick={() => setCancellingOrderId(null)}
              >
                Keep Order
              </Button>
              <Button 
                className="py-2 bg-red-600 hover:bg-red-700 text-white border-transparent" 
                onClick={() => cancelOrder(cancellingOrderId)}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
