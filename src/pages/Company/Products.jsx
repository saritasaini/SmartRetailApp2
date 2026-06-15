import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { Package, Plus, Edit2, Trash2, X, Check, Search, Image as ImageIcon, Upload, Filter, AlertCircle, ShoppingBag, FolderTree, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryNames, setNewCategoryNames] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'piece',
    category_id: '',
    stock_quantity: '',
    image_url: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = useAuthStore.getState().user;
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select(`*, categories(name)`).eq('company_id', user.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('company_id', user.id).order('name')
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      
      let allCategories = [];
      if (categoriesRes.data) {
        allCategories = [...categoriesRes.data];
      }
      
      // Also include categories that are already assigned to existing products, even if they belong to another company (from the old bug)
      if (productsRes.data) {
        productsRes.data.forEach(p => {
          if (p.category_id && p.categories?.name && !allCategories.some(c => c.id === p.category_id)) {
            allCategories.push({ id: p.category_id, name: p.categories.name });
          }
        });
      }
      
      allCategories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(allCategories);
      
      if (allCategories.length > 0) {
        setFormData(prev => ({ ...prev, category_id: allCategories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    setImageFile(null);
    setError('');
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price,
        unit: product.unit,
        category_id: product.category_id,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url || '',
        is_active: product.is_active
      });
      setImagePreview(product.image_url || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        unit: 'piece',
        category_id: categories.length > 0 ? categories[0].id : '',
        stock_quantity: '',
        image_url: '',
        is_active: true
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        image_url: finalImageUrl
      };

      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        payload.company_id = useAuthStore.getState().user.id;
        await supabase.from('products').insert([payload]);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message || 'Failed to save product. Make sure the storage bucket is created.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategoryClick = () => {
    setIsCategoryModalOpen(true);
    setNewCategoryNames('');
    setCategoryError('');
  };

  const handleSaveCategories = async (e) => {
    e.preventDefault();
    if (!newCategoryNames.trim()) return;

    setSavingCategory(true);
    setCategoryError('');

    try {
      const names = newCategoryNames
        .split('\n')
        .map(n => n.trim())
        .filter(n => n !== '');
        
      const uniqueNames = [...new Set(names)];

      // Filter out categories that already exist in the user's current list (case-insensitive)
      const existingNames = categories.map(c => c.name.toLowerCase());
      const newUniqueNames = uniqueNames.filter(name => !existingNames.includes(name.toLowerCase()));

      if (newUniqueNames.length === 0) {
        setIsCategoryModalOpen(false);
        setSavingCategory(false);
        return;
      }

      const user = useAuthStore.getState().user;
      const payload = newUniqueNames.map(name => ({ name, company_id: user.id }));

      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select();

      if (error) {
        if (error.code === '23505') {
           throw new Error(`Category already exists globally. Please ask the admin to remove the unique name constraint, or use a different name.`);
        }
        throw error;
      }

      if (data && data.length > 0) {
        setCategories(prev => {
          const updated = [...prev, ...data];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });
        setFormData(prev => ({ ...prev, category_id: data[0].id }));
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error('Error adding categories:', err);
      setCategoryError(err.message || 'Failed to add categories.');
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await supabase.from('products').delete().eq('id', id);
        fetchData();
        if (viewingProduct?.id === id) setViewingProduct(null);
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;
    
    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = p.is_active;
    else if (statusFilter === 'Deactive') matchesStatus = !p.is_active;
    else if (statusFilter === 'LowStock') matchesStatus = Number(p.stock_quantity) < 50;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const deactiveProducts = products.filter(p => !p.is_active).length;
  const lowStockProducts = products.filter(p => Number(p.stock_quantity) < 50).length;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Products Catalog</h1>
          <p className="text-sm text-text-secondary">Manage your inventory, pricing, and availability.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="md:w-auto w-full py-2">
          <Plus size={18} /> Add Product
        </Button>
      </div>

      {/* Mobile Filter Tabs */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button 
          onClick={() => setStatusFilter('All')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${statusFilter === 'All' ? 'bg-brand-caramel text-white border-brand-caramel shadow-md' : 'bg-bg-tertiary text-text-secondary border-border-light'}`}
        >
          Total Products ({totalProducts})
        </button>
        <button 
          onClick={() => setStatusFilter('Active')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${statusFilter === 'Active' ? 'bg-brand-pistachio text-white border-brand-pistachio shadow-md' : 'bg-bg-tertiary text-text-secondary border-border-light'}`}
        >
          Active ({activeProducts})
        </button>
        <button 
          onClick={() => setStatusFilter('Deactive')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${statusFilter === 'Deactive' ? 'bg-gray-500 text-white border-gray-500 shadow-md' : 'bg-bg-tertiary text-text-secondary border-border-light'}`}
        >
          Deactive ({deactiveProducts})
        </button>
        <button 
          onClick={() => setStatusFilter('LowStock')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${statusFilter === 'LowStock' ? 'bg-brand-honey text-white border-brand-honey shadow-md' : 'bg-bg-tertiary text-text-secondary border-border-light'}`}
        >
          Low Stock ({lowStockProducts})
        </button>
      </div>

      {/* Mini Dashboard Stats (Desktop only) */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        <GlassCard 
          onClick={() => setStatusFilter('All')}
          className={`relative overflow-hidden flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 ${statusFilter === 'All' ? 'shadow-lg scale-[1.02] bg-brand-caramel/5 border border-brand-caramel/20' : 'hover:bg-bg-primary/50 hover:scale-[1.01] border border-transparent'}`}
        >
          <div className={`absolute bottom-0 left-0 h-1 bg-brand-caramel transition-all duration-500 ease-out ${statusFilter === 'All' ? 'w-full' : 'w-0'}`}></div>
          <div className="p-3 rounded-lg bg-brand-caramel/10 text-brand-caramel">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Total Products</p>
            <h3 className="text-xl font-bold text-text-primary">{totalProducts}</h3>
          </div>
        </GlassCard>
        
        <GlassCard 
          onClick={() => setStatusFilter('Active')}
          className={`relative overflow-hidden flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 ${statusFilter === 'Active' ? 'shadow-lg scale-[1.02] bg-brand-pistachio/5 border border-brand-pistachio/20' : 'hover:bg-bg-primary/50 hover:scale-[1.01] border border-transparent'}`}
        >
          <div className={`absolute bottom-0 left-0 h-1 bg-brand-pistachio transition-all duration-500 ease-out ${statusFilter === 'Active' ? 'w-full' : 'w-0'}`}></div>
          <div className="p-3 rounded-lg bg-brand-pistachio/10 text-brand-pistachio">
            <FolderTree size={24} />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Active Items</p>
            <h3 className="text-xl font-bold text-text-primary">{activeProducts}</h3>
          </div>
        </GlassCard>

        <GlassCard 
          onClick={() => setStatusFilter('Deactive')}
          className={`relative overflow-hidden flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 ${statusFilter === 'Deactive' ? 'shadow-lg scale-[1.02] bg-gray-500/5 border border-gray-500/20' : 'hover:bg-bg-primary/50 hover:scale-[1.01] border border-transparent'}`}
        >
          <div className={`absolute bottom-0 left-0 h-1 bg-gray-500 transition-all duration-500 ease-out ${statusFilter === 'Deactive' ? 'w-full' : 'w-0'}`}></div>
          <div className="p-3 rounded-lg bg-gray-500/10 text-gray-500">
            <X size={24} />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Deactive Items</p>
            <h3 className="text-xl font-bold text-text-primary">{deactiveProducts}</h3>
          </div>
        </GlassCard>

        <GlassCard 
          onClick={() => setStatusFilter('LowStock')}
          className={`relative overflow-hidden flex items-center gap-4 py-4 px-5 cursor-pointer transition-all duration-300 ${statusFilter === 'LowStock' ? 'shadow-lg scale-[1.02] bg-brand-honey/5 border border-brand-honey/20' : 'hover:bg-bg-primary/50 hover:scale-[1.01] border border-transparent'}`}
        >
          <div className={`absolute bottom-0 left-0 h-1 bg-brand-honey transition-all duration-500 ease-out ${statusFilter === 'LowStock' ? 'w-full' : 'w-0'}`}></div>
          <div className="p-3 rounded-lg bg-brand-honey/10 text-brand-honey">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Low Stock Alerts</p>
            <h3 className="text-xl font-bold text-text-primary">{lowStockProducts}</h3>
          </div>
        </GlassCard>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <GlassCard className="flex items-center gap-2 flex-1 py-2 px-4">
          <Search className="text-text-secondary" size={18} />
          <input 
            type="text" 
            placeholder="Search products by name or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-sm text-text-primary focus:outline-none w-full"
          />
        </GlassCard>

        <div className="relative md:w-64 z-40">
          <GlassCard 
            className="flex items-center justify-between py-2 px-4 cursor-pointer h-full"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter className="text-text-secondary" size={18} />
              <span className="text-sm text-text-primary truncate">
                {selectedCategory === 'All' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}
              </span>
            </div>
            <ChevronDown size={16} className={`text-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </GlassCard>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-bg-secondary border border-border-light rounded-lg shadow-lg custom-scrollbar z-50 flex flex-col"
              >
                <div 
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-bg-primary ${selectedCategory === 'All' ? 'text-brand-caramel font-semibold bg-bg-primary/50' : 'text-text-primary'}`}
                  onClick={() => { setSelectedCategory('All'); setIsDropdownOpen(false); }}
                >
                  All Categories
                </div>
                {categories.map(c => (
                  <div 
                    key={c.id}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-bg-primary ${selectedCategory === c.id ? 'text-brand-caramel font-semibold bg-bg-primary/50' : 'text-text-primary'}`}
                    onClick={() => { setSelectedCategory(c.id); setIsDropdownOpen(false); }}
                  >
                    {c.name}
                  </div>
                ))}
                <div 
                  className="sticky bottom-0 z-10 px-4 py-3 text-sm cursor-pointer font-bold bg-red-500 text-white hover:bg-red-600 transition-all duration-300 flex items-center justify-center gap-2 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
                  onClick={() => { setIsDropdownOpen(false); handleAddCategoryClick(); }}
                >
                  <Plus size={16} /> Add Category
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Products Table (Compact Row Type) */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-bg-tertiary/95 backdrop-blur-sm shadow-sm">
              <tr className="border-b border-border-light">
                <th className="py-3 px-2 md:px-4 text-[10px] md:text-xs font-semibold text-text-secondary uppercase tracking-wider w-8 md:w-12 text-center md:text-left">S.No.</th>
                <th className="py-3 px-2 md:px-4 text-[10px] md:text-xs font-semibold text-text-secondary uppercase tracking-wider w-12 md:w-16 text-center md:text-left">Image</th>
                <th className="py-3 px-2 md:px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Product Info</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Price</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Stock</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-text-secondary text-sm">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-text-secondary text-sm">No products match your search.</td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id} className="border-b border-border-light/50 hover:bg-bg-primary/5 transition-colors">
                    <td className="py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-text-secondary text-center md:text-left">{index + 1}</td>
                    <td className="py-3 px-2 md:px-4 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewingProduct(product)}>
                      <div className="w-8 h-8 md:w-10 md:h-10 mx-auto md:mx-0 bg-bg-tertiary rounded-md overflow-hidden flex items-center justify-center border border-border-light">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-text-muted" size={16} />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 md:px-4 cursor-pointer group" onClick={() => setViewingProduct(product)}>
                      <p className="font-semibold text-sm md:text-base text-text-primary leading-tight group-hover:text-brand-caramel transition-colors">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-text-muted truncate max-w-[180px] mt-0.5">{product.description}</p>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <span className="text-xs font-medium text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-md border border-border-light whitespace-nowrap">
                        {product.categories?.name}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <p className="font-bold text-brand-caramel leading-tight">₹{product.price}</p>
                      <p className="text-[10px] text-text-secondary uppercase">per {product.unit}</p>
                    </td>
                    <td className="py-2 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        product.stock_quantity >= 100 ? 'bg-brand-pistachio/10 text-brand-pistachio' : 
                        product.stock_quantity >= 50 ? 'bg-brand-honey/10 text-brand-honey' : 
                        'bg-brand-caramel/10 text-brand-caramel'
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(product.id, product.is_active); }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          product.is_active 
                            ? 'bg-brand-pistachio/10 text-brand-pistachio hover:bg-brand-pistachio/20' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {product.is_active ? 'ACTIVE' : 'DEACTIVE'}
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1 justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(product); }}
                          className="p-1.5 text-text-secondary hover:text-brand-caramel hover:bg-brand-caramel/10 rounded-md transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                          className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
            >
              <GlassCard className="relative overflow-y-auto max-h-[90vh] p-6">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
                >
                  <X size={20} />
                </button>
                
                <h2 className="text-xl font-bold text-text-primary mb-5">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-2 text-red-500 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Image Upload Area */}
                  <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border-light rounded-lg bg-bg-primary hover:border-brand-caramel transition-colors group relative cursor-pointer overflow-hidden">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center text-text-primary bg-bg-secondary/90 px-4 py-2 rounded-lg shadow-sm">
                          <Edit2 size={20} className="mb-1" />
                          <span className="text-xs font-semibold">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand-caramel/10 text-brand-caramel rounded-full flex items-center justify-center mx-auto mb-2">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm text-text-primary font-medium">Upload product image</p>
                        <p className="text-xs text-text-muted mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Product Name</label>
                      <input
                        type="text" required
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Category</label>
                      <div className="flex gap-2">
                        <select 
                          className="w-full bg-bg-tertiary border border-border-light text-text-primary text-sm rounded-lg focus:ring-brand-caramel focus:border-brand-caramel p-2.5 outline-none transition-all"
                          value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}
                          required
                        >
                          <option value="" disabled>Select a category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button 
                          type="button" 
                          onClick={handleAddCategoryClick}
                          className="bg-brand-caramel/10 text-brand-caramel px-3 rounded-lg hover:bg-brand-caramel/20 transition-colors flex items-center justify-center whitespace-nowrap"
                          title="Add New Category"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Price (₹)</label>
                      <input
                        type="number" step="0.01" required min="0"
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                        className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Unit (piece, box)</label>
                      <input
                        type="text" required
                        value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                        className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Stock Quantity</label>
                      <input
                        type="number" required min="0"
                        value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})}
                        className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Description (Optional)</label>
                    <textarea
                      rows="2"
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none resize-none"
                    ></textarea>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id="is_active" 
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="w-3.5 h-3.5 rounded border-border-light bg-bg-primary focus:ring-brand-caramel text-brand-caramel"
                    />
                    <label htmlFor="is_active" className="text-xs font-medium text-text-secondary">Active</label>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border-light mt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="py-1.5 text-sm">Cancel</Button>
                    <Button type="submit" loading={saving} className="py-1.5 text-sm">Save</Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* View Product Modal */}
      <AnimatePresence>
        {viewingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm"
            onClick={() => setViewingProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-3xl"
              onClick={e => e.stopPropagation()}
            >
              <GlassCard className="relative overflow-hidden p-0 shadow-2xl border-border-light/30">
                <button 
                  onClick={() => setViewingProduct(null)}
                  className="absolute top-4 right-4 z-20 bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full text-text-secondary hover:text-text-primary transition-colors backdrop-blur-md border border-border-light/50"
                >
                  <X size={18} />
                </button>
                
                <div className="flex flex-col md:flex-row md:h-[320px] select-none">
                  {/* Left Column: Image */}
                  <div className="w-full md:w-2/5 h-56 md:h-full bg-bg-tertiary relative flex items-center justify-center shrink-0 border-r border-border-light/30">
                    {viewingProduct.image_url ? (
                      <img 
                        src={viewingProduct.image_url} 
                        alt={viewingProduct.name} 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                    ) : (
                      <ImageIcon className="text-text-muted opacity-30" size={48} />
                    )}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-caramel bg-brand-caramel/10 backdrop-blur-md px-2.5 py-1 rounded border border-brand-caramel/20 shadow-sm">
                        {viewingProduct.categories?.name || 'Uncategorized'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-bg-secondary to-bg-primary">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary mb-1 leading-tight line-clamp-2 select-text">{viewingProduct.name}</h2>
                      
                      <div className="flex items-end gap-2 mt-2 mb-3 pb-3 border-b border-border-light/30">
                        <p className="text-2xl font-bold text-brand-pistachio leading-none">
                          ₹{viewingProduct.price}
                        </p>
                        <span className="text-xs text-text-secondary font-medium mb-0.5">/ {viewingProduct.unit}</span>
                      </div>

                      {viewingProduct.description && (
                        <div className="mb-4">
                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                            {viewingProduct.description}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-6 mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Stock Level</span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              viewingProduct.stock_quantity >= 100 ? 'bg-brand-pistachio' : 
                              viewingProduct.stock_quantity >= 50 ? 'bg-brand-honey' : 
                              'bg-brand-caramel'
                            }`}></span>
                            <span className="text-sm font-bold text-text-primary">
                              {viewingProduct.stock_quantity}
                            </span>
                          </div>
                        </div>

                        <div className="w-px h-6 bg-border-light/50 self-center"></div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Status</span>
                          <div className="flex items-center mt-1">
                            {viewingProduct.is_active ? (
                              <span className="text-xs font-semibold text-brand-pistachio flex items-center gap-1.5">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                                Deactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-3 flex justify-between items-center border-t border-border-light/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(viewingProduct.id);
                        }}
                        className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <Button 
                        className="py-1.5 px-4 text-sm flex items-center gap-2"
                        onClick={() => {
                          setViewingProduct(null);
                          handleOpenModal(viewingProduct);
                        }}
                      >
                        <Edit2 size={14} /> Edit Listing
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6 relative">
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-brand-caramel/10 text-brand-caramel rounded-lg">
                    <FolderTree size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary leading-tight">Add Categories</h2>
                    <p className="text-xs text-text-secondary mt-0.5">Add multiple categories by pressing Enter</p>
                  </div>
                </div>

                {categoryError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-2 text-red-500 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveCategories}>
                  <div className="mb-4">
                    <textarea
                      autoFocus
                      rows="4"
                      placeholder="Category A&#10;Category B&#10;Category C"
                      value={newCategoryNames}
                      onChange={e => setNewCategoryNames(e.target.value)}
                      className="w-full bg-bg-primary border border-border-light rounded-lg p-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none resize-none placeholder:text-text-muted/50 custom-scrollbar leading-relaxed"
                    ></textarea>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)} className="py-2 text-sm">
                      Cancel
                    </Button>
                    <Button type="submit" loading={savingCategory} className="py-2 text-sm">
                      Save Categories
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
