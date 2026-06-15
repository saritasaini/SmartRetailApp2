-- 1. Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff',
    salary TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS for company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their own members" 
ON public.company_members FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can insert their own members" 
ON public.company_members FOR INSERT 
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own members" 
ON public.company_members FOR UPDATE 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete their own members" 
ON public.company_members FOR DELETE 
USING (auth.uid() = company_id);


-- 2. Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'System',
    type TEXT NOT NULL DEFAULT 'info', -- success, warning, info, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS for system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their own logs" 
ON public.system_logs FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can insert their own logs" 
ON public.system_logs FOR INSERT 
WITH CHECK (auth.uid() = company_id);

-- 3. Database Triggers for Automatic Stock Management
-- This function automatically deducts stock when a new order item is inserted
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.order_items;

CREATE TRIGGER trigger_update_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order();

-- This function automatically restores stock if an order is cancelled
CREATE OR REPLACE FUNCTION restock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Restock all items for this order
    UPDATE public.products
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND public.products.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_restock_on_cancel ON public.orders;

CREATE TRIGGER trigger_restock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION restock_on_cancel();


-- Create automatic payment for COD orders when delivered
CREATE OR REPLACE FUNCTION create_payment_on_cod_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.payment_method = 'cod' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes)
    VALUES (NEW.company_id, NEW.customer_id, NEW.total_amount, 'cash', 'verified', 'Auto-generated for Order ' || left(NEW.id::text, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_on_delivery ON public.orders;

CREATE TRIGGER trigger_payment_on_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION create_payment_on_cod_delivery();


-- Add order_id to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Update COD Trigger to link order_id
CREATE OR REPLACE FUNCTION create_payment_on_cod_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.payment_method = 'cod' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes, order_id)
    VALUES (NEW.company_id, NEW.customer_id, NEW.total_amount, 'cash', 'verified', 'Auto-generated for Order ' || left(NEW.id::text, 8), NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject pending UPI payments if order is cancelled
CREATE OR REPLACE FUNCTION reject_payment_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.payments 
    SET status = 'rejected', notes = notes || ' (Order Cancelled)' 
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reject_payment ON public.orders;
CREATE TRIGGER trigger_reject_payment
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION reject_payment_on_order_cancel();
