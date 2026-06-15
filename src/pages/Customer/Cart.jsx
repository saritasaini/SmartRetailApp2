import { useState } from 'react';
import { useCartStore } from '../../store/useCartStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState('ledger');
  const [upiRef, setUpiRef] = useState('');

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !user) return;
    
    if (paymentMode === 'upi' && !upiRef.trim()) {
      setError('Please enter your UPI Transaction ID (UTR)');
      return;
    }

    setPlacingOrder(true);
    setError('');
    
    try {
      // 1. Create the order record
      const totalAmount = getTotal();
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          company_id: profile?.company_id,
          total_amount: totalAmount,
          status: 'pending',
          payment_method: paymentMode
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create the order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_order: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback: delete the orphaned order record
        await supabase.from('orders').delete().eq('id', orderData.id);
        throw itemsError;
      }

      // 3. Create UPI payment record if applicable
      if (paymentMode === 'upi') {
        const { error: paymentError } = await supabase.from('payments').insert({
          company_id: profile?.company_id,
          customer_id: user.id,
          amount: totalAmount,
          payment_method: 'upi',
          status: 'pending',
          notes: `Ref: ${upiRef.trim()} - For Order #${orderData.id.slice(0, 8).toUpperCase()}`,
          order_id: orderData.id
        });
        if (paymentError) {
          console.error("Warning: Failed to create payment record for UPI", paymentError);
        }
      }

      // Success
      setOrderPlaced(true);
      clearCart();
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <GlassCard className="text-center py-12">
          <div className="w-16 h-16 bg-brand-pistachio/20 text-brand-pistachio rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Order Placed Successfully!</h2>
          <p className="text-text-secondary mb-6">Your order has been sent to the company. You can track its status in the Orders tab.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/customer/orders">
              <Button variant="outline">View Orders</Button>
            </Link>
            <Link to="/customer/catalog">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <GlassCard className="text-center py-16 flex flex-col items-center">
          <ShoppingCart size={64} className="text-text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Your cart is empty</h2>
          <p className="text-sm text-text-secondary mb-6">Looks like you haven't added any products yet.</p>
          <Link to="/customer/catalog">
            <Button>
              Browse Catalog
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Shopping Cart</h1>
        <Button variant="outline" className="text-xs text-brand-caramel border-brand-caramel hover:bg-brand-caramel/10" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <GlassCard key={product.id} className="p-4 flex gap-4 items-center">
              {/* Product Image */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-bg-tertiary rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-text-muted opacity-50" size={24} />
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-text-primary text-sm sm:text-base leading-tight line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded w-fit border border-border-light">
                    {product.categories?.name}
                  </p>
                  <p className="text-sm font-bold text-brand-caramel pt-1">₹{product.price}</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity Adjuster */}
                  <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg p-1 border border-border-light shadow-sm">
                    <button 
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="p-1.5 hover:bg-bg-primary hover:text-brand-caramel rounded text-text-secondary transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center text-text-primary">{quantity}</span>
                    <button 
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stock_quantity}
                      className={`p-1.5 rounded transition-colors ${quantity >= product.stock_quantity ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-primary hover:text-brand-caramel text-text-secondary'}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Remove Item */}
                  <button 
                    onClick={() => removeItem(product.id)}
                    className="p-2 text-text-muted hover:text-brand-caramel transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <GlassCard className="sticky top-24 p-5 space-y-4">
            <h3 className="text-lg font-bold text-text-primary border-b border-border-light pb-3">Order Summary</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-medium text-text-primary">₹{getTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Taxes & Fees</span>
                <span className="text-text-muted text-xs">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span className="text-brand-pistachio font-medium">Free</span>
              </div>
            </div>

            <div className="border-t border-border-light pt-3 mt-3">
              <div className="flex justify-between items-end mb-4">
                <span className="text-base font-bold text-text-primary">Total Amount</span>
                <span className="text-2xl font-bold text-brand-caramel">₹{getTotal().toFixed(2)}</span>
              </div>
              
              <div className="mt-6">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Select Payment Mode</label>
                <div className="flex flex-col gap-2.5">
                  {/* Pay Later */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'ledger' ? 'bg-brand-caramel/10 border-brand-caramel scale-[1.02]' : 'bg-bg-tertiary/50 border-border-light hover:bg-bg-tertiary hover:border-brand-caramel/30'}`}>
                    <input type="radio" name="payment_mode" value="ledger" checked={paymentMode === 'ledger'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'ledger' ? 'border-brand-caramel bg-brand-caramel' : 'border-text-muted bg-transparent'}`}>
                          {paymentMode === 'ledger' && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-200"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'ledger' ? 'text-brand-caramel' : 'text-text-primary'}`}>Pay Later</span>
                          <span className="block text-[10px] text-text-secondary mt-0.5">Add this order to your pending dues</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'cod' ? 'bg-brand-pistachio/10 border-brand-pistachio scale-[1.02]' : 'bg-bg-tertiary/50 border-border-light hover:bg-bg-tertiary hover:border-brand-pistachio/30'}`}>
                    <input type="radio" name="payment_mode" value="cod" checked={paymentMode === 'cod'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'cod' ? 'border-brand-pistachio bg-brand-pistachio' : 'border-text-muted bg-transparent'}`}>
                          {paymentMode === 'cod' && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-200"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'cod' ? 'text-brand-pistachio' : 'text-text-primary'}`}>Cash on Delivery</span>
                          <span className="block text-[10px] text-text-secondary mt-0.5">Pay when your order arrives</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Online (UPI) */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'upi' ? 'bg-blue-500/10 border-blue-500 scale-[1.02]' : 'bg-bg-tertiary/50 border-border-light hover:bg-bg-tertiary hover:border-blue-500/30'}`}>
                    <input type="radio" name="payment_mode" value="upi" checked={paymentMode === 'upi'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'upi' ? 'border-blue-500 bg-blue-500' : 'border-text-muted bg-transparent'}`}>
                          {paymentMode === 'upi' && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-200"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'upi' ? 'text-blue-500' : 'text-text-primary'}`}>Online Payment (UPI)</span>
                          <span className="block text-[10px] text-text-secondary mt-0.5">Pay via GPay, PhonePe, Paytm etc.</span>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                
                {paymentMode === 'upi' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-xs text-blue-500 bg-blue-500/10 px-3 py-2.5 rounded-lg mt-3 flex items-start gap-2 font-medium border border-blue-500/20">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Please pay admin directly via UPI. Share the screenshot with them to verify.</span>
                    </p>
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        UPI Transaction ID (UTR) <span className="text-brand-berry">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={upiRef}
                        onChange={(e) => setUpiRef(e.target.value)}
                        placeholder="Enter 12-digit UTR number" 
                        className="w-full bg-bg-primary border border-blue-500/30 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-brand-berry/10 text-brand-berry border border-brand-berry/20 p-3 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}

            <Button 
              className="w-full mt-6 py-3" 
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? (
                'Placing Order...'
              ) : (
                <>
                  Place Order <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-text-muted pt-2">
              By placing your order, you agree to the company's terms and conditions.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
