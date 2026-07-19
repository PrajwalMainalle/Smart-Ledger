import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaPrint, FaSpinner, FaSearch, FaBoxes } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function GstInventory() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchInventoryGst = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/gst/inventory-summary");
      setProducts(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GST inventory summary.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryGst();
  }, []);

  const handleExportCSV = () => {
    if (products.length === 0) return alert("No data to export");
    const headers = ["Product Name", "SKU", "HSN Code", "GST Purchased Stock", "Non-GST Purchased Stock", "Total Stock Balance", "Cost Price", "Stock Valuation"];
    const rows = [headers.join(",")];
    
    products.forEach(p => {
      const valuation = (p.gstStock + p.nonGstStock) * p.purchasePrice;
      rows.push(`"${p.name}","${p.sku}","${p.hsnCode}",${p.gstStock},${p.nonGstStock},${p.totalStock},${p.purchasePrice.toFixed(2)},${valuation.toFixed(2)}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_inventory_split_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && products.length === 0) {
    return <LoadingOverlay message="Compiling Inventory GST stock logs..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-400 bg-slate-950 p-6">
        <div className="border border-rose-500/20 bg-rose-500/10 p-6 rounded-2xl max-w-md text-center space-y-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) || 
    p.hsnCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalGstStock = products.reduce((sum, p) => sum + p.gstStock, 0);
  const totalNonGstStock = products.reduce((sum, p) => sum + p.nonGstStock, 0);
  const cumulativeStockValuation = products.reduce((sum, p) => sum + (p.totalStock * p.purchasePrice), 0);

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <FaBoxes className="text-orange-500" /> GST Inventory Split Summary
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Track GST and Non-GST stock counts separately for audit compliance.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition duration-150"
          >
            Print Report
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition duration-150"
          >
            <FaFileCsv /> Export CSV
          </button>
        </div>
      </div>

      {/* Tally Metrics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total GST stock count</span>
          <p className="text-lg font-black text-white font-mono">{totalGstStock}</p>
        </div>
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Non-GST stock count</span>
          <p className="text-lg font-black text-white font-mono">{totalNonGstStock}</p>
        </div>
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Stock Valuation (at Cost Price)</span>
          <p className="text-lg font-black text-orange-450 font-mono">₹{cumulativeStockValuation.toFixed(2)}</p>
        </div>
      </div>

      {/* Search Filter Panel */}
      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl mb-6 print:hidden flex items-center gap-3">
        <FaSearch className="text-slate-500 text-sm" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU code, or HSN code..."
          className="flex-1 bg-transparent text-slate-200 text-xs focus:outline-none"
        />
      </div>

      {/* Split Stock Catalog Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Product GST Stock Split</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-2">Item Description</th>
                <th className="py-3 px-2">HSN Code</th>
                <th className="py-3 px-4 text-center">GST Stock Count</th>
                <th className="py-3 px-4 text-center">Non-GST Stock Count</th>
                <th className="py-3 px-4 text-center">Total Stock count</th>
                <th className="py-3 px-4 text-right">Cost price</th>
                <th className="py-3 px-4 text-right">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350">
              {filteredProducts.map((row) => {
                const productValuation = row.totalStock * row.purchasePrice;
                return (
                  <tr key={row._id} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-4 font-mono text-slate-450">{row.sku}</td>
                    <td className="py-3 px-2 font-semibold text-slate-100">{row.name}</td>
                    <td className="py-3 px-2 font-mono text-slate-400">{row.hsnCode}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-100 font-mono">{row.gstStock}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-150 font-mono">{row.nonGstStock}</td>
                    <td className="py-3 px-4 text-center font-black text-orange-400 font-mono">{row.totalStock}</td>
                    <td className="py-3 px-4 text-right font-mono">₹{row.purchasePrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-100 font-black font-mono">₹{productValuation.toFixed(2)}</td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 font-sans">No products found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default GstInventory;
