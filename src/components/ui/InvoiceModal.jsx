import { useState, useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import Button from './Button';
import { supabase } from '../../lib/supabase';

export default function InvoiceModal({ order, profile, onClose }) {
  if (!order) return null;

  const [companyDetails, setCompanyDetails] = useState({ shop_name: 'INVOICE', address: '', phone: '' });

  useEffect(() => {
    async function fetchCompany() {
      // The order inherently belongs to a company, so use its company_id
      const companyId = order?.company_id || (profile?.role === 'customer' ? profile?.company_id : profile?.id);
      if (companyId) {
        const { data } = await supabase.from('profiles').select('shop_name, address, phone').eq('id', companyId).single();
        if (data) setCompanyDetails({ shop_name: data.shop_name || 'INVOICE', address: data.address || '', phone: data.phone || '' });
      }
    }
    fetchCompany();
  }, [profile, order]);

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-6 md:p-12 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl relative my-8 sm:my-auto">
        
        {/* Controls (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-800">Invoice #{order.id.slice(0, 8).toUpperCase()}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-100 flex items-center gap-2 py-1.5">
              <Printer size={16} /> Print
            </Button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-5 sm:p-8 md:p-12 text-gray-800 font-sans print:p-0 print:text-black">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-gray-200 pb-8 mb-8">
            <div className="w-full">
              <h1 className="text-3xl font-extrabold text-[#8B5A2B] tracking-tight mb-1 uppercase">{companyDetails.shop_name}</h1>
              <p className="text-sm text-gray-600">Wholesale Distributors & Manufacturers</p>
              <div className="mt-4 text-sm text-gray-600 space-y-1">
                <p>{companyDetails.address || 'Industrial Area, Phase 1'}</p>
                <p>Contact: <span className="font-medium text-gray-800">{companyDetails.phone || '+91 98765 43210'}</span></p>
              </div>
            </div>
            
            <div className="w-full md:text-right bg-gray-50 md:bg-transparent p-5 md:p-0 rounded-xl border border-gray-100 md:border-none print:bg-transparent print:border-none">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 md:text-gray-400 uppercase tracking-widest mb-4">Tax Invoice</h2>
              <div className="grid grid-cols-2 md:flex md:flex-col gap-4 md:gap-2 text-sm">
                <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-1 md:gap-3">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Invoice No</span>
                  <span className="font-bold text-gray-800 bg-white md:bg-transparent px-2 py-1 md:p-0 rounded border border-gray-100 md:border-none">INV-{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-1 md:gap-3">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Date</span>
                  <span className="font-bold text-gray-800 bg-white md:bg-transparent px-2 py-1 md:p-0 rounded border border-gray-100 md:border-none">{invoiceDate}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-1 md:gap-3 col-span-2 md:col-span-1">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Status</span>
                  <span className={`font-bold uppercase px-2 py-1 md:p-0 rounded border md:border-none inline-block text-center ${
                    order.status === 'cancelled' ? 'text-red-600 bg-red-50 border-red-100' : 
                    order.status === 'pending' ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 
                    'text-green-600 bg-green-50 border-green-100'
                  }`}>{order.status.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-1 md:gap-3 col-span-2 md:col-span-1">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Payment Mode</span>
                  <span className="font-bold text-gray-800 bg-white md:bg-transparent px-2 py-1 md:p-0 rounded border border-gray-100 md:border-none">
                    {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'upi' ? 'Online (UPI)' : 'Pay Later'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100 print:bg-transparent print:p-0 print:border-none">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="text-lg font-bold text-gray-800">{profile?.shop_name || 'Retailer'}</p>
            <p className="text-sm text-gray-600 mt-1">{profile?.owner_name}</p>
            <p className="text-sm text-gray-600 mt-1">{profile?.address}</p>
            <p className="text-sm text-gray-600 mt-1">Phone: {profile?.phone}</p>
          </div>

          {/* Items Table (Responsive) */}
          <div className="mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y-2 border-gray-800 text-gray-800">
                  <th className="hidden sm:table-cell py-3 px-2 font-bold text-sm uppercase whitespace-nowrap">S.No</th>
                  <th className="py-2 sm:py-3 px-1 sm:px-2 font-bold text-[10px] sm:text-sm uppercase">Item</th>
                  <th className="hidden sm:table-cell py-3 px-2 font-bold text-sm uppercase text-center whitespace-nowrap">Unit</th>
                  <th className="py-2 sm:py-3 px-1 sm:px-2 font-bold text-[10px] sm:text-sm uppercase text-right whitespace-nowrap">Qty</th>
                  <th className="py-2 sm:py-3 px-1 sm:px-2 font-bold text-[10px] sm:text-sm uppercase text-right whitespace-nowrap">Rate</th>
                  <th className="py-2 sm:py-3 px-1 sm:px-2 font-bold text-[10px] sm:text-sm uppercase text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {order.order_items?.length > 0 ? order.order_items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="hidden sm:table-cell py-4 px-2 text-gray-500 font-medium">{idx + 1}</td>
                    <td className="py-3 sm:py-4 px-1 sm:px-2 font-bold text-gray-800 text-[11px] sm:text-sm leading-tight">
                      {item.products?.name}
                      <span className="sm:hidden block text-[9px] font-normal text-gray-500 capitalize mt-0.5">{item.products?.unit}</span>
                    </td>
                    <td className="hidden sm:table-cell py-4 px-2 text-center text-gray-500 capitalize">{item.products?.unit}</td>
                    <td className="py-3 sm:py-4 px-1 sm:px-2 text-right font-medium text-[11px] sm:text-sm">{item.quantity}</td>
                    <td className="py-3 sm:py-4 px-1 sm:px-2 text-right text-gray-500 text-[11px] sm:text-sm">₹{item.price_at_order}</td>
                    <td className="py-3 sm:py-4 px-1 sm:px-2 text-right font-bold text-gray-800 text-[11px] sm:text-sm">₹{(item.quantity * item.price_at_order).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">No items found for this order.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end bg-gray-50 sm:bg-transparent p-5 sm:p-0 rounded-xl sm:rounded-none border border-gray-100 sm:border-none print:bg-transparent print:border-none">
            <div className="w-full sm:max-w-sm">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200/60 sm:border-gray-200">
                    <td className="py-3 px-2 text-gray-500 font-medium">Subtotal</td>
                    <td className="py-3 px-2 text-right font-bold text-gray-800">₹{order.total_amount}</td>
                  </tr>
                  <tr className="border-b border-gray-200/60 sm:border-gray-200">
                    <td className="py-3 px-2 text-gray-500 font-medium">Tax / GST (Included)</td>
                    <td className="py-3 px-2 text-right font-bold text-gray-800">₹0.00</td>
                  </tr>
                  <tr className="sm:border-b-2 sm:border-gray-800 text-lg md:text-xl">
                    <td className="py-4 px-2 font-extrabold text-gray-800">Total Amount</td>
                    <td className="py-4 px-2 text-right font-extrabold text-[#8B5A2B]">₹{order.total_amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 sm:mt-16 sm:pt-8 print:mt-12 print:pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-4 print:hidden">This is a computer generated invoice and does not require a physical signature.</p>
          </div>
          
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: auto; margin: 0mm; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute; left: 0; top: 0; right: 0; bottom: auto; background: transparent; backdrop-filter: none; padding: 0; display: block; overflow: visible; min-height: auto; height: auto; }
          .bg-white.w-full.max-w-3xl { max-w-none; box-shadow: none; border: none; margin: 0; padding: 15mm 20mm; min-height: auto; height: auto; }
          .p-5.sm\\:p-8.md\\:p-12 { padding: 0; }
          .bg-white.w-full.max-w-3xl * { visibility: visible; }
        }
      `}} />
    </div>
  );
}
