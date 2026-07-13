import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IoSearch } from "react-icons/io5";
import { FaBoxes, FaPlus, FaTimes, FaEdit, FaTrashAlt, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { fetchProducts, addProduct, updateProduct, deleteProduct } from "../inventorySlice";
import LoadingOverlay from "../../../components/LoadingOverlay";

function ProductList() {
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector((state) => state.inventory);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "Stationery",
    price: "",
    prices: {
      purchase: "",
      retail: "",
      shop: "",
      school: "",
      wholesale: "",
      dealer: ""
    },
    customPrices: [], // array of { category: "", price: "" } for custom tiers
    gstRate: "18",
    stock: "",
    image: ""
  });

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Unique categories list for filters
  const categories = ["All", ...new Set(products.map((p) => p?.category || "Stationery"))];

  // Calculations for KPI banners
  const totalProducts = products.length;
  const totalStockCount = products.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const totalInventoryValue = products.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.stock || 0)), 0);
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

  // Filtered products list
  const filteredProducts = products.filter((prod) => {
    if (!prod) return false;
    const matchesCategory = categoryFilter === "All" || prod.category === categoryFilter;
    const name = prod.name || "";
    const sku = prod.sku || "";
    const desc = prod.description || "";
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Helper to compile prices for saving
  const compilePricesForSubmit = () => {
    const productPrices = {};
    
    // Compile standard prices
    Object.keys(formData.prices).forEach(k => {
      if (formData.prices[k] !== "") {
        productPrices[k] = parseFloat(formData.prices[k]) || 0;
      } else {
        productPrices[k] = 0;
      }
    });

    // Compile custom prices
    formData.customPrices.forEach(item => {
      if (item.category.trim() !== "" && item.price !== "") {
        productPrices[item.category.trim().toLowerCase()] = parseFloat(item.price) || 0;
      }
    });

    return productPrices;
  };

  // Handle Add Product Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.prices.retail || !formData.stock) {
      alert("Please fill all required fields (Name, SKU, Retail Price, Stock).");
      return;
    }

    const productPrices = compilePricesForSubmit();

    const newProd = {
      name: formData.name,
      sku: formData.sku,
      description: formData.description,
      category: formData.category,
      price: productPrices.retail || parseFloat(formData.price || 0),
      prices: productPrices,
      gstRate: parseInt(formData.gstRate),
      stock: parseInt(formData.stock),
      image: formData.image
    };

    dispatch(addProduct(newProd)).then((res) => {
      if (!res.error) {
        setShowAddModal(false);
        resetForm();
      } else {
        alert(res.payload || "Failed to create product");
      }
    });
  };

  // Trigger Edit Modal
  const openEditModal = (prod) => {
    setCurrentProduct(prod);
    
    const pricesObj = prod.prices || {};
    // Extract standard prices (Maps inside JSON are just standard objects in Redux/state payload)
    const standardPrices = {
      purchase: (pricesObj.purchase !== undefined ? pricesObj.purchase : "").toString(),
      retail: (pricesObj.retail !== undefined ? pricesObj.retail : prod.price || "").toString(),
      shop: (pricesObj.shop !== undefined ? pricesObj.shop : "").toString(),
      school: (pricesObj.school !== undefined ? pricesObj.school : "").toString(),
      wholesale: (pricesObj.wholesale !== undefined ? pricesObj.wholesale : "").toString(),
      dealer: (pricesObj.dealer !== undefined ? pricesObj.dealer : "").toString()
    };

    // Extract custom prices (any price keys other than standard ones)
    const standardKeys = ["purchase", "retail", "shop", "school", "wholesale", "dealer"];
    const customList = [];
    Object.keys(pricesObj).forEach(key => {
      if (!standardKeys.includes(key)) {
        customList.push({ category: key, price: pricesObj[key].toString() });
      }
    });

    setFormData({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || "",
      category: prod.category,
      price: prod.price.toString(),
      prices: standardPrices,
      customPrices: customList,
      gstRate: prod.gstRate.toString(),
      stock: prod.stock.toString(),
      image: prod.image || ""
    });
    setShowEditModal(true);
  };

  // Handle Edit Product Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.prices.retail || !formData.stock) {
      alert("Please fill all required fields (Name, SKU, Retail Price, Stock).");
      return;
    }

    const productPrices = compilePricesForSubmit();

    const updatedProd = {
      _id: currentProduct._id || currentProduct.id,
      name: formData.name,
      sku: formData.sku,
      description: formData.description,
      category: formData.category,
      price: productPrices.retail || parseFloat(formData.price || 0),
      prices: productPrices,
      gstRate: parseInt(formData.gstRate),
      stock: parseInt(formData.stock),
      image: formData.image
    };

    dispatch(updateProduct(updatedProd)).then((res) => {
      if (!res.error) {
        setShowEditModal(false);
        resetForm();
      } else {
        alert(res.payload || "Failed to update product");
      }
    });
  };

  // Handle Delete Product
  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      dispatch(deleteProduct(id)).then((res) => {
        if (res.error) {
          alert(res.payload || "Failed to delete product");
        }
      });
    }
  };

  // Reset helper
  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      category: "Stationery",
      price: "",
      prices: {
        purchase: "",
        retail: "",
        shop: "",
        school: "",
        wholesale: "",
        dealer: ""
      },
      customPrices: [],
      gstRate: "18",
      stock: "",
      image: ""
    });
    setCurrentProduct(null);
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Inventory &amp; Products</h2>
            <p className="text-slate-400 text-sm mt-1">Manage catalog items, adjust unit costs, select tax GST codes, and log stock levels.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 text-xs"
          >
            <FaPlus /> Add New Product
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Statistical KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Items Catalogued</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{totalProducts} Products</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Units Stocked</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{totalStockCount} Units</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Estimated Stock Value</span>
            <p className="text-xl font-bold text-slate-100 mt-1">₹{totalInventoryValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Out of Stock Alerts</span>
            <p className={`text-xl font-bold mt-1 ${outOfStockCount > 0 ? "text-rose-500 animate-pulse" : "text-slate-100"}`}>
              {outOfStockCount} Alerts
            </p>
          </div>
        </div>

        {/* Search and Filters toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
          <div className="relative w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search by product name, SKU or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <IoSearch className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-855 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory list Table */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-lg relative">
          {loading && <LoadingOverlay message="Retrieving inventory items..." />}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-2">Product Name</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2 text-right">Base Price</th>
                  <th className="py-3 px-2 text-right">GST Map</th>
                  <th className="py-3 px-2 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300">
                {filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock === 0;
                  const isLowStock = prod.stock > 0 && prod.stock <= 5;
                  const prodId = prod._id || prod.id;

                  return (
                    <tr key={prodId} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-400">{prod.sku}</td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-950 border border-slate-900 rounded-md overflow-hidden flex items-center justify-center text-slate-700">
                            {prod.image ? (
                              <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <FaBoxes size={18} />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 notranslate" translate="no">{prod.name}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">{prod.description || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-slate-400">{prod.category}</td>
                      <td className="py-4 px-2 text-right relative group">
                        <div className="font-bold text-slate-100 cursor-help">
                          ₹{prod.price.toFixed(2)}
                          <span className="text-[9px] text-slate-500 block font-normal capitalize">retail rate</span>
                        </div>
                        
                        {/* Hover Tooltip Card */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 invisible group-hover:visible bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-left text-[11px] text-slate-350 min-w-[160px] space-y-1.5 transition-all duration-150 transform scale-95 group-hover:scale-100">
                          <h5 className="font-black text-orange-400 uppercase tracking-wider text-[9px] border-b border-slate-800 pb-1 mb-1">Pricing Tiers</h5>
                          <div className="flex justify-between gap-4">
                            <span>Purchase Cost:</span>
                            <span className="font-bold font-mono text-slate-200">₹{(prod.prices?.purchase || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Retail Selling:</span>
                            <span className="font-bold font-mono text-slate-200">₹{(prod.prices?.retail || prod.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Shop Trade:</span>
                            <span className="font-bold font-mono text-slate-200">₹{(prod.prices?.shop || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>School Trade:</span>
                            <span className="font-bold font-mono text-slate-200">₹{(prod.prices?.school || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Wholesale Rate:</span>
                            <span className="font-bold font-mono text-slate-200">₹{(prod.prices?.wholesale || 0).toFixed(2)}</span>
                          </div>
                          {prod.prices?.dealer > 0 && (
                            <div className="flex justify-between gap-4">
                              <span>Dealer Rate:</span>
                              <span className="font-bold font-mono text-slate-200">₹{parseFloat(prod.prices.dealer).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* Dynamic Custom Prices */}
                          {Object.keys(prod.prices || {}).map((k) => {
                            const standardKeys = ["purchase", "retail", "shop", "school", "wholesale", "dealer"];
                            if (!standardKeys.includes(k) && prod.prices[k] !== undefined) {
                              return (
                                <div key={k} className="flex justify-between gap-4 capitalize">
                                  <span>{k}:</span>
                                  <span className="font-bold font-mono text-slate-200">₹{parseFloat(prod.prices[k]).toFixed(2)}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right text-slate-400">{prod.gstRate}% GST</td>
                      <td className="py-4 px-2 text-center font-bold">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs
                          ${isOutOfStock 
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black animate-pulse" 
                            : isLowStock 
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }
                        `}>
                          {(isOutOfStock || isLowStock) && <FaExclamationTriangle className="text-[10px]" />}
                          {isOutOfStock ? "Out of Stock" : `${prod.stock} left`}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                            title="Edit product"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(prodId, prod.name)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20 transition"
                            title="Delete product"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-sm">No inventory items match active filter query.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaBoxes className="text-orange-500" /> Add New Inventory Product
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Product Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">SKU Code (Unique) *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Stationery">Stationery</option>
                    <option value="Sports">Sports</option>
                    <option value="Art Supplies">Art Supplies</option>
                    <option value="Books">Books</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">GST Rate (%)</label>
                  <select 
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                </div>
              </div>

              {/* Multiple Selling Prices grid */}
              <div className="border-t border-slate-800/80 pt-3 mt-1">
                <h4 className="text-orange-400 font-bold uppercase tracking-wider text-[9px] mb-2">Pricing Categories</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Purchase Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.purchase}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, purchase: e.target.value } 
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Retail Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.retail}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, retail: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Shop Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.shop}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, shop: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">School Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.school}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, school: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Wholesale Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.wholesale}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, wholesale: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Dealer Price (Optional)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.prices.dealer}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, dealer: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom prices */}
              <div className="space-y-2 mt-1 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-orange-400 font-bold uppercase tracking-wider text-[9px]">Custom Price Categories</span>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, customPrices: [...formData.customPrices, { category: "", price: "" }] })}
                    className="text-[10px] font-black text-amber-500 hover:text-amber-400"
                  >
                    + Add Category
                  </button>
                </div>
                {formData.customPrices.map((cp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text" placeholder="e.g. VIP" required
                      value={cp.category}
                      onChange={(e) => {
                        const newList = [...formData.customPrices];
                        newList[idx].category = e.target.value;
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="flex-1 bg-slate-955 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 focus:outline-none focus:border-orange-500 capitalize"
                    />
                    <input 
                      type="number" step="0.01" placeholder="₹ Rate" required
                      value={cp.price}
                      onChange={(e) => {
                        const newList = [...formData.customPrices];
                        newList[idx].price = e.target.value;
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="w-24 bg-slate-955 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 focus:outline-none focus:border-orange-500 font-mono text-right"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const newList = formData.customPrices.filter((_, i) => i !== idx);
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Stock Quantity *</label>
                  <input 
                    type="number" 
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Image URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/image.jpg"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Create Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaEdit className="text-orange-500" /> Edit Product Details
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-200">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Product Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">SKU Code *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Stationery">Stationery</option>
                    <option value="Sports">Sports</option>
                    <option value="Art Supplies">Art Supplies</option>
                    <option value="Books">Books</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">GST Rate (%)</label>
                  <select 
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                </div>
              </div>

              {/* Multiple Selling Prices grid */}
              <div className="border-t border-slate-800/80 pt-3 mt-1">
                <h4 className="text-orange-400 font-bold uppercase tracking-wider text-[9px] mb-2">Pricing Categories</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Purchase Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.purchase}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, purchase: e.target.value } 
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Retail Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.retail}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, retail: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Shop Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.shop}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, shop: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">School Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.school}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, school: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Wholesale Price *</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.prices.wholesale}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, wholesale: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Dealer Price (Optional)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.prices.dealer}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        prices: { ...formData.prices, dealer: e.target.value } 
                      })}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom prices */}
              <div className="space-y-2 mt-1 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-orange-400 font-bold uppercase tracking-wider text-[9px]">Custom Price Categories</span>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, customPrices: [...formData.customPrices, { category: "", price: "" }] })}
                    className="text-[10px] font-black text-amber-500 hover:text-amber-400"
                  >
                    + Add Category
                  </button>
                </div>
                {formData.customPrices.map((cp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text" placeholder="e.g. VIP" required
                      value={cp.category}
                      onChange={(e) => {
                        const newList = [...formData.customPrices];
                        newList[idx].category = e.target.value;
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="flex-1 bg-slate-955 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 focus:outline-none focus:border-orange-500 capitalize"
                    />
                    <input 
                      type="number" step="0.01" placeholder="₹ Rate" required
                      value={cp.price}
                      onChange={(e) => {
                        const newList = [...formData.customPrices];
                        newList[idx].price = e.target.value;
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="w-24 bg-slate-955 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 focus:outline-none focus:border-orange-500 font-mono text-right"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const newList = formData.customPrices.filter((_, i) => i !== idx);
                        setFormData({ ...formData, customPrices: newList });
                      }}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Stock Quantity *</label>
                  <input 
                    type="number" 
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Image URL</label>
                <input 
                  type="text" 
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProductList;
