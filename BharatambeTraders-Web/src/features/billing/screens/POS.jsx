import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { IoSearch } from "react-icons/io5";
import { MdDeleteOutline, MdClear } from "react-icons/md";
import { FaUser, FaPhoneAlt, FaCalculator, FaBarcode, FaCheckCircle, FaPrint, FaTimes, FaSpinner, FaDownload, FaCalendarAlt } from "react-icons/fa";
import { 
  addToCart, 
  removeFromCart, 
  updateCartQty, 
  updateCartItemPrice,
  addManualItem,
  setCustomerInfo, 
  setPaymentMethod, 
  checkout,
  updateInvoice,
  clearCart,
  updateInvoicePaymentMethod,
  restoreCartAndBillingState
} from "../billingSlice";
import { fetchProducts } from "../../inventory/inventorySlice";
import { fetchCustomers, addCustomer } from "../../customers/customerSlice";
import logo from "../../../assets/SLLogo.png";
import LoadingOverlay from "../../../components/LoadingOverlay";
import axiosInstance from "../../../app/api/axiosInstance";


function POS() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Selectors
  const { products, loading: productsLoading } = useSelector((state) => state.inventory);
  const { customers } = useSelector((state) => state.customers);
  const { cart, customerName, customerPhone, customerType, priceCategory, paymentMethod, loading: checkoutLoading } = useSelector((state) => state.billing);
  const { user, token: authStoreToken } = useSelector((state) => state.auth);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Customer autocomplete states
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  
  // Quick Add Customer modal state
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: "", phone: "", customerType: "Retail", priceCategory: "retail" });

  // Manual Item modal state
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({ name: "", price: "", qty: 1, gstRate: 0, addToRevenue: true });

  // Manual Discount states
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "fixed"
  const [discountValue, setDiscountValue] = useState(0);

  // Quotation & PDF settings
  const [isQuotation, setIsQuotation] = useState(false);
  const [pageSize, setPageSize] = useState("auto");
  const [orientation, setOrientation] = useState("portrait");
  const [isGstBilling, setIsGstBilling] = useState(false);
  const [quotationReceiptData, setQuotationReceiptData] = useState(null);
  const [activeTabReceipt, setActiveTabReceipt] = useState("tax"); // "tax" | "quotation"
  const [customInvoiceDate, setCustomInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Credit Outstanding & Return Exchange states
  const [amountPaidToday, setAmountPaidToday] = useState(0);
  const [returnedItems, setReturnedItems] = useState([]);
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  // Edit payment method states for receipt modal
  const [editMethod, setEditMethod] = useState("");
  const [editCash, setEditCash] = useState(0);
  const [editUpi, setEditUpi] = useState(0);
  const [editAmountPaid, setEditAmountPaid] = useState(0);

  // Government School Fund states
  const [selectedGovSchoolId, setSelectedGovSchoolId] = useState("");
  const [selectedGovGrantId, setSelectedGovGrantId] = useState("");
  const [selectedGovTeacherId, setSelectedGovTeacherId] = useState("");
  const [govSchoolsList, setGovSchoolsList] = useState([]);
  const [govGrantsList, setGovGrantsList] = useState([]);
  const [govTeachersList, setGovTeachersList] = useState([]);

  useEffect(() => {
    if (paymentMethod === "Government School Fund") {
      axiosInstance.get("/gov-funds/schools").then((res) => setGovSchoolsList(res.data)).catch(console.error);
      axiosInstance.get("/gov-funds/grants").then((res) => setGovGrantsList(res.data)).catch(console.error);
      axiosInstance.get("/gov-funds/teachers").then((res) => setGovTeachersList(res.data)).catch(console.error);
    }
  }, [paymentMethod]);
  
  // Return Lookup Modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState("");
  const [returnSearchResults, setReturnSearchResults] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnDefects, setReturnDefects] = useState({});
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState("");

  // Totals calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const subtotal = calculateCartSubtotal();

  const calculateDiscountAmount = () => {
    if (discountType === "fixed") {
      return Math.min(Number(discountValue) || 0, subtotal);
    }
    const pct = Number(discountValue) || 0;
    return (subtotal * pct) / 100;
  };

  const discountAmt = calculateDiscountAmount();
  const discountedSubtotal = subtotal - discountAmt;

  const isInclusiveGst = isGstBilling && (customerType === "School" || customerType === "Retail");

  const calculateGstAmount = () => {
    if (!isGstBilling) return 0;
    const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    return cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.qty;
      const discountedItemSubtotal = itemSubtotal * discountRatio;
      const gstRate = item.gstRate || 0;
      if (isInclusiveGst) {
        return sum + (discountedItemSubtotal - (discountedItemSubtotal / (1 + gstRate / 100)));
      } else {
        return sum + (discountedItemSubtotal * gstRate) / 100;
      }
    }, 0);
  };

  const gstAmt = calculateGstAmount();
  
  // Calculate returned total with tax
  const returnedTotalWithTax = returnedItems.reduce((sum, item) => {
    const itemSub = item.price * item.qty;
    const itemGst = (itemSub * (item.gstRate || 0)) / 100;
    return sum + itemSub + itemGst;
  }, 0);

  const newTotal = isInclusiveGst ? discountedSubtotal : (discountedSubtotal + gstAmt);
  const unroundedGrandTotal = Math.max(0, newTotal - returnedTotalWithTax);
  const grandTotal = Math.round(unroundedGrandTotal);
  const roundOff = Math.round((grandTotal - unroundedGrandTotal) * 100) / 100;

  // Load products and customers on mount
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCustomers());
  }, [dispatch]);

  // Load invoice back to POS for editing/exchange if passed in state
  useEffect(() => {
    if (location.state && location.state.editInvoice && products.length > 0) {
      const invoice = location.state.editInvoice;
      
      const restoredCart = invoice.items.map(item => {
        if (item.isManualItem) {
          return {
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: null,
            name: item.name,
            price: item.price,
            originalPrice: item.price,
            prices: { retail: item.price },
            priceCategoryUsed: "manual",
            qty: item.qty,
            gstRate: item.gstRate || 0,
            sku: "MANUAL",
            maxStock: 999999,
            isManualItem: true
          };
        } else {
          const prod = products.find(p => p._id === item.productId);
          const currentStock = prod ? prod.stock : 0;
          return {
            id: item.productId,
            productId: item.productId,
            name: item.name,
            price: item.price,
            originalPrice: prod ? prod.price : item.price,
            prices: prod ? prod.prices : {},
            priceCategoryUsed: item.priceCategoryUsed || "retail",
            qty: item.qty,
            gstRate: item.gstRate || 0,
            sku: item.sku,
            maxStock: currentStock + item.qty,
            isManualItem: false
          };
        }
      });

      dispatch(restoreCartAndBillingState({
        cart: restoredCart,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerType: invoice.customerType || "Retail",
        priceCategory: invoice.priceCategory || "retail",
        discount: invoice.discountPercent || 0,
        paymentMethod: invoice.paymentMethod || "Cash"
      }));

      setDiscountValue(invoice.discountPercent || 0);
      setDiscountType("percent");
      setIsGstBilling(invoice.isGstBilling !== false);
      setIsQuotation(invoice.isQuotation || false);
      if (invoice.date) {
        setCustomInvoiceDate(new Date(invoice.date).toISOString().split("T")[0]);
      }
      setEditingInvoiceId(invoice._id);
      setEditingInvoiceNumber(invoice.invoiceId);
      setCustomerSearch(invoice.customerName === "Walk-in Customer" ? "" : invoice.customerName);

      if (invoice.paymentMethod === "Credit") {
        setAmountPaidToday(invoice.amountPaid || 0);
      } else if (invoice.paymentMethod === "Split") {
        setCashAmount(invoice.cashAmount || 0);
        setUpiAmount(invoice.upiAmount || 0);
      }

      // Clear router location state so it doesn't trigger on every rerender
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products, dispatch]);

  useEffect(() => {
    if (paymentMethod === "Split") {
      setCashAmount(grandTotal);
      setUpiAmount(0);
    } else {
      setCashAmount(0);
      setUpiAmount(0);
    }
  }, [paymentMethod]);

  // Automatically toggle GST Invoicing based on customer selection (School and Retail default to GST; Shops, Wholesalers, Dealers, Walk-in default to Non-GST)
  useEffect(() => {
    if (!editingInvoiceId) {
      if (customerName && customerName !== "Walk-in Customer" && (customerType === "School" || customerType === "Retail")) {
        setIsGstBilling(true);
      } else {
        setIsGstBilling(false);
      }
    }
  }, [customerName, customerType, editingInvoiceId]);

  useEffect(() => {
    if (grandTotal === 0 && (returnedItems.length > 0 || editingInvoiceId)) {
      dispatch(setPaymentMethod("Exchange"));
    }
  }, [grandTotal, returnedItems.length, editingInvoiceId, dispatch]);

  useEffect(() => {
    if (receiptData) {
      setEditMethod(receiptData.paymentMethod);
      setEditCash(receiptData.cashAmount || 0);
      setEditUpi(receiptData.upiAmount || 0);
      setEditAmountPaid(receiptData.amountPaid || 0);
    }
  }, [receiptData]);

  // Categories list based on items
  const categories = ["All", ...new Set(products.map((p) => p?.category || "Stationery"))];

  // Filters
  const filteredProducts = products.filter((product) => {
    if (!product) return false;
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const name = product.name || "";
    const sku = product.sku || "";
    const desc = product.description || "";
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle SKU Quick add
  const handleSkuSearch = (e) => {
    if (e.key === "Enter") {
      const match = products.find(p => p.sku.toLowerCase() === searchTerm.toLowerCase());
      if (match) {
        const inCartItem = cart.find(c => c.productId === match._id);
        const cartQty = inCartItem ? inCartItem.qty : 0;
        if (match.stock > cartQty) {
          dispatch(addToCart(match));
          setSearchTerm("");
        } else {
          alert(`Item ${match.name} is out of stock / limit reached!`);
        }
      }
    }
  };

  // Perform Checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Cart is empty! Add products to checkout.");
      return;
    }

    if (paymentMethod === "Credit" && (!customerName || customerName === "Walk-in Customer")) {
      alert("Please select or search a valid customer for Credit bills. Walk-in Customer cannot be used for Credit transactions.");
      return;
    }

    if (paymentMethod === "Government School Fund") {
      if (!selectedGovSchoolId) {
        alert("Please select a Government School for Government School Fund payment.");
        return;
      }
      const selSchoolObj = govSchoolsList.find((s) => s._id === selectedGovSchoolId);
      const remaining = selSchoolObj?.remainingAmount ?? selSchoolObj?.grantedAmount ?? 0;
      if (grandTotal > remaining) {
        alert(`Insufficient Granted Amount for '${selSchoolObj?.schoolName}'! Bill total is ₹${grandTotal.toFixed(2)}, but available balance is only ₹${remaining.toFixed(2)}.`);
        return;
      }
    }

    // Verify no item exceeds available stock
    const overStockItem = cart.find(item => item.qty > item.maxStock);
    if (overStockItem) {
      alert(`Cannot proceed to checkout. The requested quantity for '${overStockItem.name}' (${overStockItem.qty}) exceeds the available stock of ${overStockItem.maxStock} units.`);
      return;
    }

    // Verify no item has invalid quantity (<= 0)
    const invalidQtyItem = cart.find(item => item.qty <= 0);
    if (invalidQtyItem) {
      alert(`Cannot proceed to checkout. Please specify a valid quantity for '${invalidQtyItem.name}'.`);
      return;
    }

    const checkoutItems = cart.map(item => ({
      ...item,
      gstRate: isGstBilling ? (item.gstRate || 0) : 0
    }));

    const formatReceiptObj = (inv) => ({
      id: inv.invoiceId,
      _id: inv._id,
      date: inv.date,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerType: inv.customerType,
      items: [...inv.items],
      subtotal: inv.subtotal,
      discountPercent: inv.discountPercent,
      discountAmount: inv.discountAmount,
      gstAmount: inv.gstAmount,
      total: inv.total,
      paymentMethod: inv.paymentMethod,
      cashAmount: inv.cashAmount,
      upiAmount: inv.upiAmount,
      pdfUrl: inv.pdfUrl,
      isQuotation: inv.isQuotation,
      isGstBilling: inv.isGstBilling,
      amountPaid: inv.amountPaid,
      outstandingAmount: inv.outstandingAmount,
      returnedItems: inv.returnedItems || [],
    });

    // Dual Bill Mode: User selected BOTH GST Calculation AND Quotation / Estimate
    if (isGstBilling && isQuotation && !editingInvoiceId) {
      const taxInvoiceData = {
        customerName,
        customerPhone,
        customerType,
        discountType,
        discountValue,
        isQuotation: false, // 1. Tax Invoice
        items: checkoutItems,
        isGstBilling: true,
        amountPaid: paymentMethod === "Credit" ? amountPaidToday : (paymentMethod === "Split" ? (cashAmount + upiAmount) : (paymentMethod === "Exchange" ? 0 : grandTotal)),
        returnedItems: returnedItems,
        cashAmount: paymentMethod === "Split" ? cashAmount : 0,
        upiAmount: paymentMethod === "Split" ? upiAmount : 0,
        date: customInvoiceDate,
        govSchoolId: paymentMethod === "Government School Fund" ? selectedGovSchoolId : null,
        govGrantId: paymentMethod === "Government School Fund" ? selectedGovGrantId : null,
        govTeacherId: paymentMethod === "Government School Fund" ? selectedGovTeacherId : null,
      };

      dispatch(checkout(taxInvoiceData)).then((resTax) => {
        if (!resTax.error) {
          const savedTaxInvoice = resTax.payload;

          const quotationData = {
            customerName,
            customerPhone,
            customerType,
            discountType,
            discountValue,
            isQuotation: true, // 2. Quotation / Estimate
            items: checkoutItems,
            isGstBilling: true,
            amountPaid: 0,
            returnedItems: [],
            cashAmount: 0,
            upiAmount: 0,
            date: customInvoiceDate,
            govSchoolId: paymentMethod === "Government School Fund" ? selectedGovSchoolId : null,
            govGrantId: paymentMethod === "Government School Fund" ? selectedGovGrantId : null,
            govTeacherId: paymentMethod === "Government School Fund" ? selectedGovTeacherId : null,
          };

          dispatch(checkout(quotationData)).then((resQuote) => {
            setReceiptData(formatReceiptObj(savedTaxInvoice));
            if (!resQuote.error) {
              setQuotationReceiptData(formatReceiptObj(resQuote.payload));
            } else {
              setQuotationReceiptData(null);
            }

            dispatch(fetchProducts());
            setDiscountValue(0);
            setIsQuotation(false);
            setCustomInvoiceDate(new Date().toISOString().split("T")[0]);
            setAmountPaidToday(0);
            setReturnedItems([]);
            setEditingInvoiceId(null);
            setEditingInvoiceNumber("");
            setActiveTabReceipt("tax");
            setShowCheckoutModal(true);
          });
        } else {
          alert(resTax.payload || "Checkout failed for Tax Invoice");
        }
      });
      return;
    }

    // Standard Single Bill Creation
    const checkoutAction = editingInvoiceId
      ? updateInvoice({
          invoiceId: editingInvoiceId,
          checkoutData: {
            customerName,
            customerPhone,
            customerType,
            discountType,
            discountValue,
            isQuotation,
            items: checkoutItems,
            isGstBilling,
            amountPaid: paymentMethod === "Credit" ? amountPaidToday : (paymentMethod === "Split" ? (cashAmount + upiAmount) : (paymentMethod === "Exchange" ? 0 : grandTotal)),
            returnedItems: returnedItems,
            cashAmount: paymentMethod === "Split" ? cashAmount : 0,
            upiAmount: paymentMethod === "Split" ? upiAmount : 0,
            date: customInvoiceDate,
            govSchoolId: paymentMethod === "Government School Fund" ? selectedGovSchoolId : null,
            govGrantId: paymentMethod === "Government School Fund" ? selectedGovGrantId : null,
            govTeacherId: paymentMethod === "Government School Fund" ? selectedGovTeacherId : null,
          }
        })
      : checkout({
          customerName,
          customerPhone,
          customerType,
          discountType,
          discountValue,
          isQuotation,
          items: checkoutItems,
          isGstBilling,
          amountPaid: paymentMethod === "Credit" ? amountPaidToday : (paymentMethod === "Split" ? (cashAmount + upiAmount) : (paymentMethod === "Exchange" ? 0 : grandTotal)),
          returnedItems: returnedItems,
          cashAmount: paymentMethod === "Split" ? cashAmount : 0,
          upiAmount: paymentMethod === "Split" ? upiAmount : 0,
          date: customInvoiceDate,
          govSchoolId: paymentMethod === "Government School Fund" ? selectedGovSchoolId : null,
          govGrantId: paymentMethod === "Government School Fund" ? selectedGovGrantId : null,
          govTeacherId: paymentMethod === "Government School Fund" ? selectedGovTeacherId : null,
        });

    dispatch(checkoutAction).then((res) => {
      if (!res.error) {
        const savedInvoice = res.payload;
        setReceiptData(formatReceiptObj(savedInvoice));
        setQuotationReceiptData(null);

        dispatch(fetchProducts());
        setDiscountValue(0);
        setIsQuotation(false);
        setCustomInvoiceDate(new Date().toISOString().split("T")[0]);
        setAmountPaidToday(0);
        setReturnedItems([]);
        setEditingInvoiceId(null);
        setEditingInvoiceNumber("");
        setActiveTabReceipt("tax");
        setShowCheckoutModal(true);
      } else {
        alert(res.payload || "Checkout failed");
      }
    });
  };

  const handleUpdatePaymentMethod = () => {
    dispatch(updateInvoicePaymentMethod({
      invoiceId: receiptData._id,
      paymentMethod: editMethod,
      cashAmount: editMethod === "Split" ? editCash : 0,
      upiAmount: editMethod === "Split" ? editUpi : 0,
      amountPaid: editMethod === "Credit" ? editAmountPaid : (editMethod === "Split" ? (editCash + editUpi) : receiptData.total)
    })).then((res) => {
      if (!res.error) {
        const updated = res.payload;
        setReceiptData({
          ...receiptData,
          paymentMethod: updated.paymentMethod,
          cashAmount: updated.cashAmount,
          upiAmount: updated.upiAmount,
          amountPaid: updated.amountPaid,
          outstandingAmount: updated.outstandingAmount,
        });
        alert("Payment method updated successfully!");
      } else {
        alert(res.payload || "Failed to update payment method");
      }
    });
  };

  const handleEditCurrentBill = async () => {
    if (!receiptData) return;

    if (!window.confirm("Are you sure you want to cancel this generated invoice and load items back to the cart to edit them?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/billing/${receiptData._id}`);

      const restoredCart = receiptData.items.map(item => {
        if (item.isManualItem) {
          return {
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: null,
            name: item.name,
            price: item.price,
            originalPrice: item.price,
            prices: { retail: item.price },
            priceCategoryUsed: "manual",
            qty: item.qty,
            gstRate: item.gstRate || 0,
            sku: "MANUAL",
            maxStock: 999999,
            isManualItem: true
          };
        } else {
          const prod = products.find(p => p._id === item.productId);
          const currentStock = prod ? prod.stock : 0;
          return {
            id: item.productId,
            productId: item.productId,
            name: item.name,
            price: item.price,
            originalPrice: prod ? prod.price : item.price,
            prices: prod ? prod.prices : {},
            priceCategoryUsed: item.priceCategoryUsed || "retail",
            qty: item.qty,
            gstRate: item.gstRate || 0,
            sku: item.sku,
            maxStock: currentStock + item.qty,
            isManualItem: false
          };
        }
      });

      dispatch(restoreCartAndBillingState({
        cart: restoredCart,
        customerName: receiptData.customerName,
        customerPhone: receiptData.customerPhone,
        customerType: receiptData.customerType || "Retail",
        priceCategory: receiptData.priceCategory || "retail",
        discount: receiptData.discountPercent || 0,
        paymentMethod: receiptData.paymentMethod || "Cash"
      }));

      setDiscountValue(receiptData.discountPercent || 0);
      setDiscountType("percent");
      setIsGstBilling(receiptData.isGstBilling !== false);
      setIsQuotation(receiptData.isQuotation || false);
      if (receiptData.date) {
        setCustomInvoiceDate(new Date(receiptData.date).toISOString().split("T")[0]);
      }
      if (receiptData.paymentMethod === "Credit") {
        setAmountPaidToday(receiptData.amountPaid || 0);
      } else if (receiptData.paymentMethod === "Split") {
        setCashAmount(receiptData.cashAmount || 0);
        setUpiAmount(receiptData.upiAmount || 0);
      }
      
      setCustomerSearch(receiptData.customerName === "Walk-in Customer" ? "" : receiptData.customerName);

      dispatch(fetchProducts());

      setShowCheckoutModal(false);
      setReceiptData(null);

      alert("Invoice cancelled and items restored to cart. You can now modify and checkout again.");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to edit bill items");
    }
  };

  // Browser Printing Trigger using dynamic PDF streaming (via blob same-origin URL to avoid CORS blocks)
  const triggerPrint = () => {
    const pdfUrl = getDynamicPdfUrl();
    if (!pdfUrl) return;

    fetch(pdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        let iframe = document.getElementById("print-iframe");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "print-iframe";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          document.body.appendChild(iframe);
        }
        iframe.src = blobUrl;
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }, 200);
        };
      })
      .catch((err) => {
        console.error("Print fetch failed, opening in new tab instead:", err);
        window.open(pdfUrl, "_blank");
      });
  };

  const getDynamicPdfUrl = () => {
    if (!receiptData?._id) return "";
    const serverUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000";
    const token = authStoreToken || user?.token || "";
    return `${serverUrl}/api/billing/${receiptData._id}/pdf?pageSize=${pageSize}&orientation=${orientation}&token=${token}&t=${Date.now()}`;
  };

  const getPdfDownloadLink = () => {
    const url = getDynamicPdfUrl();
    return url ? `${url}&download=true` : "";
  };

  const handleReturnSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!returnSearchQuery.trim()) return;
    try {
      setReturnLoading(true);
      const response = await axiosInstance.get(`/billing/lookup-invoice?query=${encodeURIComponent(returnSearchQuery)}`);
      setReturnSearchResults(response.data);
      setReturnLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed to search invoices. Ensure server is active.");
      setReturnLoading(false);
    }
  };

  const handleSelectInvoiceForReturn = (invoice) => {
    setSelectedInvoiceForReturn(invoice);
    const qtys = {};
    const defects = {};
    invoice.items.forEach(item => {
      qtys[item.productId || item.name] = 0;
      defects[item.productId || item.name] = false;
    });
    setReturnQuantities(qtys);
    setReturnDefects(defects);
  };

  const handleConfirmReturnExchange = () => {
    if (!selectedInvoiceForReturn) return;
    const itemsToReturn = [];
    selectedInvoiceForReturn.items.forEach(item => {
      const key = item.productId || item.name;
      const q = returnQuantities[key] || 0;
      if (q > 0) {
        itemsToReturn.push({
          productId: item.productId,
          name: item.name,
          qty: q,
          price: item.price,
          gstRate: item.gstRate || 0,
          sku: item.sku || "MANUAL",
          originalInvoiceId: selectedInvoiceForReturn.invoiceId,
          isDefective: !!returnDefects[key]
        });
      }
    });

    if (itemsToReturn.length === 0) {
      alert("Please select at least 1 item with quantity > 0.");
      return;
    }

    setReturnedItems([...returnedItems, ...itemsToReturn]);
    setShowReturnModal(false);
    setSelectedInvoiceForReturn(null);
    setReturnSearchResults([]);
    setReturnSearchQuery("");
  };

  const handleQuickAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustForm.name || !newCustForm.phone) {
      alert("Name and Phone are required.");
      return;
    }
    dispatch(addCustomer(newCustForm)).then((res) => {
      if (!res.error) {
        const savedCust = res.payload;
        dispatch(setCustomerInfo({
          name: savedCust.name,
          phone: savedCust.phone,
          customerType: savedCust.customerType,
          priceCategory: savedCust.priceCategory
        }));
        setCustomerSearch(savedCust.name);
        setShowAddCustModal(false);
        setNewCustForm({ name: "", phone: "", customerType: "Retail", priceCategory: "retail" });
      } else {
        alert(res.payload || "Failed to create customer");
      }
    });
  };

  const handleQuickAddCustTypeChange = (typeVal) => {
    let categoryVal = "retail";
    switch (typeVal) {
      case "Retail":
        categoryVal = "retail";
        break;
      case "Shop":
        categoryVal = "shop";
        break;
      case "School":
        categoryVal = "school";
        break;
      case "Wholesale":
        categoryVal = "wholesale";
        break;
      case "Dealer":
        categoryVal = "dealer";
        break;
      case "Distributor":
        categoryVal = "distributor";
        break;
      default:
        categoryVal = "retail";
    }
    setNewCustForm({ ...newCustForm, customerType: typeVal, priceCategory: categoryVal });
  };


  const handleAddManualItemSubmit = (e) => {
    e.preventDefault();
    if (!manualItemForm.name || !manualItemForm.price) {
      alert("Name and Price are required.");
      return;
    }
    dispatch(addManualItem({
      ...manualItemForm,
      excludeFromRevenue: !manualItemForm.addToRevenue
    }));
    setShowAddManualModal(false);
    setManualItemForm({ name: "", price: "", qty: 1, gstRate: 0, addToRevenue: true });
  };

  const currentActiveReceipt = (activeTabReceipt === "quotation" && quotationReceiptData) 
    ? quotationReceiptData 
    : receiptData;
  const profile = user?.profile || {};
  const shopName = profile.shopName || user?.businessName || "SmartLedger";
  const address = profile.businessAddress || "N/A Address";
  const gstNumber = profile.gstNumber || "N/A GSTIN";
  const isCurrentGst = currentActiveReceipt ? (currentActiveReceipt.isGstBilling !== false) : isGstBilling;
  const contactPhone = isCurrentGst ? "9845757296" : "6361037157";
  const logoSrc = profile.logo || logo;

  return (
    <div className="flex flex-col xl:flex-row gap-6 bg-slate-950 text-slate-100 min-h-screen xl:min-h-0 xl:h-[calc(100vh-96px)] rounded-2xl border border-slate-900 overflow-hidden relative">
      
      {checkoutLoading && <LoadingOverlay message="Processing invoice transaction..." />}

      {editingInvoiceId && (
        <div className="absolute top-0 inset-x-0 bg-amber-500/20 border-b border-amber-500/35 px-4 py-3 flex items-center justify-between text-xs text-amber-250 font-bold z-40 backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            ⚠️ You are editing Invoice: <span className="font-mono underline">{editingInvoiceNumber}</span>. Saving checkout will modify this bill directly.
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingInvoiceId(null);
              setEditingInvoiceNumber("");
              dispatch(clearCart());
            }}
            className="text-amber-400 hover:text-amber-200 uppercase font-mono tracking-wider hover:underline"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* LEFT: PRODUCTS BROWSER */}
      <div className="flex-1 p-6 space-y-6 flex flex-col xl:h-full xl:overflow-y-auto">
        
        {/* Search, SKU scanner input */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-lg">
            <input 
              type="text" 
              placeholder="Search products, categories, or press Enter for barcode SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSkuSearch}
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <IoSearch size={18} />
            </div>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 cursor-help" title="Enter SKU to quick-add to cart">
              <FaBarcode size={18} className="text-orange-500" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setShowAddManualModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-500/10"
            >
              + Custom Item
            </button>
            <button 
              type="button"
              onClick={() => setShowReturnModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-500/10"
            >
              🔄 Return / Exchange
            </button>
            <div className="text-xs text-slate-550 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-900">
              Scanner Port: <span className="text-emerald-450 font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Category filtering chips */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200
                  ${isActive 
                    ? "bg-orange-500 text-white border-transparent shadow-md shadow-orange-500/10" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-205 hover:bg-slate-800"
                  }
                `}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 relative">
          {productsLoading && <LoadingOverlay message="Loading billing products..." />}
          
          {filteredProducts.map((product) => {
            const outOfStock = product.stock <= 0;
            const inCart = cart.find(item => item.productId === product._id);
            const cartQty = inCart ? inCart.qty : 0;
            const remainingStock = product.stock - cartQty;

            return (
              <div 
                key={product._id}
                onClick={() => !outOfStock && remainingStock > 0 && dispatch(addToCart(product))}
                className={`group rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 relative select-none
                  ${outOfStock || remainingStock <= 0 
                    ? "bg-slate-950/40 border-slate-950 opacity-40 cursor-not-allowed" 
                    : "bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/70 cursor-pointer shadow-lg"
                  }
                `}
              >
                <div className="h-32 rounded-lg bg-slate-950 overflow-hidden mb-3 border border-slate-900 flex items-center justify-center text-slate-700 relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <FaBarcode size={42} className="text-slate-800" />
                  )}
                  {cartQty > 0 && (
                    <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white shadow-md">
                      {cartQty} in Cart
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="font-bold text-slate-205 text-sm line-clamp-1 group-hover:text-orange-400 transition-colors notranslate" translate="no">{product.name}</h4>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-450 font-mono tracking-tight">{product.sku}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{product.description || "No description provided."}</p>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-900/80">
                  <div>
                    <span className="text-[10px] text-slate-550 block">Rate Cost</span>
                    <span className="text-sm font-black text-white">₹{product.price.toFixed(2)}</span>
                  </div>
                  
                  {outOfStock ? (
                    <span className="text-xs font-bold text-rose-500">Out of Stock</span>
                  ) : remainingStock <= 0 ? (
                    <span className="text-xs font-bold text-amber-500">Limit Reached</span>
                  ) : (
                    <div className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      Stock: <span className="font-bold text-slate-200">{remainingStock}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && !productsLoading && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-600">
              <FaBarcode size={48} className="animate-pulse mb-3" />
              <p className="text-sm">No items found matching the search terms.</p>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT: CART AND CHECKOUT LOGIC */}
      <div className="w-full xl:w-96 bg-slate-900 border-t xl:border-t-0 xl:border-l border-slate-900 p-6 flex flex-col xl:h-full xl:overflow-y-auto space-y-6">
        
        {/* Customer logging */}
        <div className="space-y-3 relative">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450">Customer Details</h3>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowAddCustModal(true)}
                className="text-[10px] text-orange-500 hover:text-orange-400 font-bold"
              >
                + Quick Add
              </button>
              {customerName && customerName !== "Walk-in Customer" && (
                <button 
                  type="button" 
                  onClick={() => {
                    setCustomerSearch("");
                    dispatch(setCustomerInfo({ name: "Walk-in Customer", phone: "N/A", customerType: "Retail", priceCategory: "retail" }));
                  }}
                  className="text-[10px] text-rose-500 hover:text-rose-455 font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search customers by name or phone..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustDropdown(true);
              }}
              onFocus={() => setShowCustDropdown(true)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            />
            <IoSearch size={12} className="absolute left-3 top-3 text-slate-600" />
            
            {showCustDropdown && customerSearch.trim() !== "" && (() => {
              const matchedCustomers = customers.filter(c => {
                if (!c) return false;
                const name = c.name || "";
                const phone = c.phone || "";
                return name.toLowerCase().includes(customerSearch.toLowerCase()) || phone.includes(customerSearch);
              });

              return (
                <div className="absolute left-0 right-0 mt-1 z-30 bg-slate-900 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-slate-850">
                  {matchedCustomers.map(cust => (
                    <div 
                      key={cust._id}
                      onClick={() => {
                        dispatch(setCustomerInfo({
                          name: cust.name,
                          phone: cust.phone,
                          customerType: cust.customerType,
                          priceCategory: cust.priceCategory
                        }));
                        setCustomerSearch(cust.name);
                        setShowCustDropdown(false);
                      }}
                      className="p-2 hover:bg-slate-800 cursor-pointer text-left text-xs text-slate-200"
                    >
                      <div className="font-semibold">{cust.name}</div>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                        <span>📞 {cust.phone}</span>
                        <span className="text-orange-400 font-semibold">{cust.customerType} ({cust.priceCategory})</span>
                      </div>
                    </div>
                  ))}
                  {matchedCustomers.length === 0 && (
                    <div className="p-2 text-center text-slate-500 text-xs">No customer profiles found.</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Current selected customer details panel */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Name:</span>
              <span className="font-bold text-slate-205">{customerName || "Walk-in Customer"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="font-mono text-slate-400">{customerPhone || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pricing Tier:</span>
              <span className="font-bold text-orange-400 capitalize">
                {priceCategory ? `${priceCategory} Price` : "Retail Price"}
                <span className="text-[10px] text-slate-500 font-normal ml-1">({customerType || "Retail"})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cart items list */}
        <div className="flex-1 flex flex-col min-h-[200px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450 border-b border-slate-800 pb-2 flex justify-between">
            <span>Bill items</span>
            <span className="text-slate-500 font-normal">({cart.length} unique)</span>
          </h3>

          <div className="flex-1 divide-y divide-slate-800/50 overflow-y-auto max-h-[250px] mt-2 pr-1 space-y-2">
            {cart.map((item) => {
              const exceedsStock = item.qty > item.maxStock;
              return (
                <div key={item.id} className="py-2.5 flex flex-col justify-center text-xs gap-1.5 border-b border-slate-800/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate notranslate text-left flex items-center gap-1.5" translate="no">
                        {item.name}
                        {item.isManualItem && (
                          <span className="px-1.5 py-0.2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[8px] font-black uppercase tracking-wider">
                            Manual
                          </span>
                        )}
                        {item.excludeFromRevenue && (
                          <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded text-[8px] font-black uppercase tracking-wider">
                            Non-Revenue
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-500">
                        <span className="capitalize">{item.priceCategoryUsed || "retail"} Price: ₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            dispatch(updateCartItemPrice({ id: item.id, price: newPrice }));
                          }}
                          className="w-16 h-5 bg-slate-950 border border-slate-700 rounded px-1 text-[10px] text-orange-400 font-bold focus:outline-none focus:border-orange-500 font-mono text-center"
                        />
                        <span>| GST: {item.gstRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => {
                          if (item.qty > 1) {
                            dispatch(updateCartQty({ id: item.id, qty: Number(item.qty) - 1 }));
                          } else {
                            dispatch(removeFromCart(item.id));
                          }
                        }}
                        className="w-6 h-6 rounded bg-slate-950 border border-slate-850 hover:bg-slate-800 hover:text-orange-400 text-slate-300 flex items-center justify-center font-bold text-xs select-none transition"
                        title="Decrease Quantity"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            dispatch(updateCartQty({ id: item.id, qty: 0 }));
                          } else {
                            const parsed = parseInt(val, 10);
                            if (!isNaN(parsed)) {
                              dispatch(updateCartQty({ id: item.id, qty: Math.max(0, parsed) }));
                            }
                          }
                        }}
                        onBlur={() => {
                          if (item.qty <= 0) {
                            dispatch(removeFromCart(item.id));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.target.blur();
                          }
                        }}
                        className={`w-12 h-6 text-center font-bold bg-slate-950 border rounded text-xs text-slate-100 focus:outline-none focus:border-orange-500
                          ${exceedsStock ? "border-rose-500 text-rose-450 focus:border-rose-500" : "border-slate-850"}
                        `}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (item.qty < item.maxStock) {
                            dispatch(updateCartQty({ id: item.id, qty: Number(item.qty) + 1 }));
                          } else {
                            alert(`Warning: Cannot increase quantity beyond available stock (${item.maxStock} units).`);
                          }
                        }}
                        className="w-6 h-6 rounded bg-slate-950 border border-slate-850 hover:bg-slate-800 hover:text-orange-400 text-slate-300 flex items-center justify-center font-bold text-xs select-none transition"
                        title="Increase Quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right pl-1 min-w-[70px]">
                      <p className="font-bold text-slate-200 font-mono">₹{(item.price * item.qty).toFixed(2)}</p>
                      <button 
                        onClick={() => dispatch(removeFromCart(item.id))}
                        className="text-slate-600 hover:text-red-400 transition-colors mt-0.5"
                        title="Remove item"
                      >
                        <MdDeleteOutline size={16} />
                      </button>
                    </div>
                  </div>

                  {exceedsStock && (
                    <div className="text-[10px] text-rose-500 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/25 flex items-center justify-between">
                      <span>⚠️ Exceeds stock</span>
                      <span>Max available: {item.maxStock}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {returnedItems.length > 0 && (
              <div className="mt-4 space-y-2 pt-2 border-t border-slate-900">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block text-left">Returned Items Adjustment</span>
                {returnedItems.map((item, idx) => (
                  <div key={`ret_${idx}`} className="bg-rose-955/10 bg-slate-900/40 border border-rose-900/20 rounded-xl p-3 space-y-2 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-rose-300 truncate notranslate" translate="no">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">Invoice: {item.originalInvoiceId} {item.isDefective ? "(Defective)" : "(Reusable)"}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setReturnedItems(returnedItems.filter((_, i) => i !== idx));
                        }}
                        className="text-rose-400 hover:text-rose-300 transition-colors"
                        title="Cancel return item"
                      >
                        <MdClear size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">Qty: {item.qty} @ ₹{item.price.toFixed(2)}</span>
                      <span className="font-bold text-rose-450 font-mono">-₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length === 0 && returnedItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-12 text-slate-600">
                <FaCalculator className="text-3xl mb-2" />
                <p className="text-xs">Cart is empty.</p>
                <p className="text-[10px] text-slate-700">Click products on left to build bill.</p>
              </div>
            )}
          </div>
        </div>

        {/* Calculations breakdown */}
        <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 text-xs">
          
          <div className="flex justify-between">
            <span className="text-slate-500">Cart Subtotal</span>
            <span className="font-semibold text-slate-300 font-mono">₹{subtotal.toFixed(2)}</span>
          </div>

          {returnedItems.length > 0 && (
            <div className="flex justify-between text-rose-400 font-semibold border-b border-slate-900 pb-1">
              <span>Returns Deduct (with Tax)</span>
              <span className="font-mono">-₹{returnedTotalWithTax.toFixed(2)}</span>
            </div>
          )}

          {/* Dynamic manual discount settings */}
          <div className="space-y-2 py-1 border-t border-b border-slate-900/80 my-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Discount type:</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => { setDiscountType("percent"); setDiscountValue(0); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition
                    ${discountType === "percent" ? "bg-orange-500 text-white border-transparent" : "bg-slate-900 border-slate-800 text-slate-400"}
                  `}
                >
                  % Percent
                </button>
                <button 
                  type="button"
                  onClick={() => { setDiscountType("fixed"); setDiscountValue(0); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition
                    ${discountType === "fixed" ? "bg-orange-500 text-white border-transparent" : "bg-slate-900 border-slate-800 text-slate-400"}
                  `}
                >
                  ₹ Fixed
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Enter Discount Value:</span>
              <input 
                type="number"
                min="0"
                max={discountType === "percent" ? "100" : subtotal}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-right font-semibold font-mono text-slate-205 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Discount Amount</span>
            <span className="font-semibold text-rose-400 font-mono">-₹{discountAmt.toFixed(2)}</span>
          </div>

          {!isInclusiveGst && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST (Central Tax)</span>
                <span className="font-semibold text-slate-450 font-mono">₹{(gstAmt / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST (State Tax)</span>
                <span className="font-semibold text-slate-450 font-mono">₹{(gstAmt / 2).toFixed(2)}</span>
              </div>
            </>
          )}

          {isInclusiveGst && (
            <div className="flex justify-between text-[11px] text-emerald-450 font-bold">
              <span>GST (Included in Prices)</span>
              <span className="font-mono">₹{gstAmt.toFixed(2)}</span>
            </div>
          )}

          {Math.abs(roundOff) >= 0.01 && (
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Round Off</span>
              <span className="font-mono">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
            </div>
          )}

          <div className="h-px bg-slate-800/80 my-2"></div>

          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-200">
              Grand Total {isInclusiveGst && <span className="text-[10px] text-slate-500 font-normal block">(Inclusive of all taxes)</span>}
            </span>
            <span className="text-base font-black text-orange-500 font-mono">₹{grandTotal.toFixed(2)}</span>
          </div>

        </div>

        {/* Payment mode choice */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-450 block">Payment Method</span>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const baseMethods = ["Cash", "UPI", "Card", "Credit", "Split", "Government School Fund"];
              const methods = (returnedItems.length > 0 || editingInvoiceId)
                ? [...baseMethods, "Exchange"]
                : baseMethods;
              return methods.map((method) => {
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => dispatch(setPaymentMethod(method))}
                    className={`flex-1 min-w-[80px] py-2 px-1 rounded-lg text-[11px] font-bold border transition-all duration-150
                      ${active 
                        ? "bg-slate-950 border-orange-500 text-orange-400 font-extrabold shadow" 
                        : "bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200"
                      }
                    `}
                  >
                    {method}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {paymentMethod === "Government School Fund" && (
          <div className="bg-slate-900/80 p-3 rounded-lg border border-amber-500/30 text-xs space-y-2.5 text-left">
            <span className="text-[11px] font-bold uppercase text-amber-400 block tracking-wider flex items-center gap-1.5">
              🏛️ Government School Details
            </span>

            {/* Select School */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Government School *</label>
              <select
                value={selectedGovSchoolId}
                onChange={(e) => setSelectedGovSchoolId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select Government School --</option>
                {govSchoolsList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.schoolName} (HM: {s.headmasterName})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Remaining Balance Alert */}
            {selectedGovSchoolId && (() => {
              const selSchoolObj = govSchoolsList.find((s) => s._id === selectedGovSchoolId);
              const granted = selSchoolObj?.grantedAmount || 0;
              const remaining = selSchoolObj?.remainingAmount ?? granted;
              const hasBalance = remaining >= grandTotal;

              return (
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Head Master:</span>
                    <span className="font-semibold text-slate-200">{selSchoolObj?.headmasterName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Contact Number:</span>
                    <span className="font-mono text-slate-200">{selSchoolObj?.contactNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Granted Amount:</span>
                    <span className="font-bold text-slate-100">₹{granted.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between text-[11px] font-black pt-1 border-t border-slate-800 ${
                    hasBalance ? "text-emerald-400" : "text-red-400"
                  }`}>
                    <span>Remaining Balance:</span>
                    <span>₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {!hasBalance && (
                    <p className="text-[10px] text-red-400 font-bold pt-1 text-center">
                      ⚠️ Bill total exceeds school remaining balance!
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {paymentMethod === "Credit" && (
          <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-xs">
            <span className="text-slate-450 font-bold">Amount Paid Today (₹):</span>
            <input 
              type="number"
              min="0"
              max={grandTotal}
              value={amountPaidToday}
              onChange={(e) => setAmountPaidToday(parseFloat(e.target.value) || 0)}
              className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-semibold font-mono text-slate-205 focus:outline-none focus:border-orange-500"
            />
          </div>
        )}

        {paymentMethod === "Split" && (
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-xs space-y-2 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-450 font-bold">Cash Paid (₹):</span>
              <input 
                type="number"
                min="0"
                max={grandTotal}
                value={cashAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setCashAmount(val);
                  setUpiAmount(Math.max(0, grandTotal - val));
                }}
                className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-semibold font-mono text-slate-205 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-450 font-bold">UPI Paid (₹):</span>
              <input 
                type="number"
                min="0"
                max={grandTotal}
                value={upiAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setUpiAmount(val);
                  setCashAmount(Math.max(0, grandTotal - val));
                }}
                className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-semibold font-mono text-slate-205 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        )}

        {/* Invoice Date Adjustment */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-xs space-y-1.5 text-left">
          <div className="flex justify-between items-center">
            <label htmlFor="invoiceDate" className="text-slate-350 font-bold flex items-center gap-1.5 cursor-pointer">
              <FaCalendarAlt className="text-orange-500" /> Invoice Date (DD/MM/YYYY):
            </label>
            {customInvoiceDate !== new Date().toISOString().split("T")[0] && (
              <button
                type="button"
                onClick={() => setCustomInvoiceDate(new Date().toISOString().split("T")[0])}
                className="text-[10px] text-orange-400 hover:underline font-semibold"
              >
                Reset Today
              </button>
            )}
          </div>
          <input
            type="date"
            id="invoiceDate"
            value={customInvoiceDate}
            onChange={(e) => setCustomInvoiceDate(e.target.value)}
            className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-orange-500 bg-slate-950 cursor-pointer"
          />
        </div>

        {/* GST Billing Toggle */}
        <div className="flex items-center gap-2.5 py-1 select-none">
          <input
            type="checkbox"
            id="isGstBilling"
            checked={isGstBilling}
            onChange={(e) => setIsGstBilling(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-800 focus:ring-orange-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="isGstBilling" className="text-xs font-semibold text-slate-350 cursor-pointer">
            Enable GST Calculation (CGST/SGST)
          </label>
        </div>

        {/* Quotation / Estimate Toggle */}
        <div className="flex items-center gap-2.5 py-1 select-none">
          <input
            type="checkbox"
            id="isQuotation"
            checked={isQuotation}
            onChange={(e) => setIsQuotation(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-800 focus:ring-orange-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="isQuotation" className="text-xs font-semibold text-slate-350 cursor-pointer">
            Generate as Quotation / Estimate
          </label>
        </div>

        {/* Dual Mode Indicator */}
        {isGstBilling && isQuotation && (
          <div className="text-[10.5px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2 flex items-center gap-1.5 mt-0.5">
            <span>✨</span>
            <span><strong>Dual Creation:</strong> Creates <strong>Tax Invoice</strong> & <strong>Quotation</strong> simultaneously in 1 click!</span>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || checkoutLoading || cart.some(item => item.qty > item.maxStock || item.qty <= 0)}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform transform active:scale-98 text-xs
            ${(cart.length === 0 || cart.some(item => item.qty > item.maxStock || item.qty <= 0))
              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
              : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            }
          `}
        >
          {checkoutLoading ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Proceed to Checkout</>}
        </button>

      </div>

      {/* PRINTABLE INVOICE / CHECKOUT MODAL OVERLAY */}
      {showCheckoutModal && receiptData && (
        (() => {
          const currentActiveReceipt = (activeTabReceipt === "quotation" && quotationReceiptData) 
            ? quotationReceiptData 
            : receiptData;

          const activePdfUrl = `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000"}/api/billing/${currentActiveReceipt._id}/pdf?pageSize=${pageSize}&orientation=${orientation}&token=${authStoreToken || user?.token || ""}&t=${Date.now()}`;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                
                {/* Modal Header Bar */}
                <div className="bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-900">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-emerald-500" /> 
                      {quotationReceiptData 
                        ? "Dual Bills Generated (Tax Invoice & Quotation)" 
                        : (receiptData.isQuotation ? "Quotation / Estimate Generated" : "Tax Invoice Generated")
                      }
                    </h3>

                    {/* Tab Switcher if Dual Bill Generated */}
                    {quotationReceiptData && (
                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveTabReceipt("tax")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            activeTabReceipt === "tax"
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          📄 Tax Invoice ({receiptData.id})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTabReceipt("quotation")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            activeTabReceipt === "quotation"
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          📋 Quotation ({quotationReceiptData.id})
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setReceiptData(null);
                      setQuotationReceiptData(null);
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>

                {/* Split Content Body */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[68vh]">
                  {/* Left Column: Live PDF Preview */}
                  <div className="flex-1 bg-slate-950 border-r border-slate-850 flex flex-col h-full min-h-[300px] md:min-h-0">
                    <div className="p-3 bg-slate-950 border-b border-slate-850 flex flex-wrap justify-between items-center gap-2">
                      <span className="font-bold text-xs text-slate-300">Live Generated PDF Preview</span>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Size:</label>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350"
                        >
                          <option value="auto">Auto-Fit</option>
                          <option value="A4">A4 Paper</option>
                          <option value="A3">A3 Paper</option>
                        </select>

                        <label className="text-[10px] text-slate-500 font-bold uppercase">Layout:</label>
                        <select
                          value={orientation}
                          onChange={(e) => setOrientation(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                    </div>
                    <iframe
                      src={activePdfUrl}
                      className="w-full h-full flex-1 border-none bg-slate-950"
                      title="Live Invoice PDF"
                    />
                  </div>

                  {/* Right Column: Modern HTML Print Receipt Preview */}
                  <div className="w-full md:w-[480px] overflow-y-auto p-4 bg-slate-950 flex flex-col h-full">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">
                      POS Print Receipt Preview ({currentActiveReceipt.isQuotation ? "Quotation" : "Tax Invoice"})
                    </div>
                    <div className="bg-white p-4 rounded-lg overflow-y-auto flex-1 max-h-full" style={{ color: "#1e293b" }}>
                      <div id="invoice-print-area">
                        <div className="print-receipt">
                          {/* Top Header Row with Logo Badge, Shop Title & Right GSTIN/Mobile */}
                          <div className="top-header-row">
                            <div className="brand-badge-container">
                              {logoSrc ? (
                                <img src={logoSrc} alt="Logo" className="brand-logo-img" />
                              ) : (
                                <div className="brand-badge-title">SmartLedger<br/><span className="brand-badge-sub">Your Business Partner</span></div>
                              )}
                            </div>

                            <div className="header-center-info">
                              <h1 className="header-shop-title">{shopName.toUpperCase()}</h1>
                              <div className="header-shop-sub">W H O L E S A L E R ' S</div>
                            </div>

                            <div className="top-right-contact">
                              {currentActiveReceipt.isGstBilling !== false && (
                                <div><strong>GSTIN:</strong> {gstNumber}</div>
                              )}
                              <div><strong>Mobile:</strong> {contactPhone}</div>
                            </div>
                          </div>

                          <div className="gold-divider-line"></div>

                          <div className="shop-tagline-bar">
                            {profile.businessDescription || "Office Stationery • School Items • Note Books • Xerox Papers • Sports Items • Computer Materials & More"}
                          </div>

                          {/* Document Title with side accent lines */}
                          <div className="doc-title-wrapper">
                            <div className="doc-title-line"></div>
                            <div className="doc-title-text">
                              {currentActiveReceipt.isQuotation
                                ? "Estimate / Quotation"
                                : (currentActiveReceipt.isGstBilling !== false ? "Tax Invoice" : `${(currentActiveReceipt.paymentMethod || "CASH").toUpperCase()} BILL`)}
                            </div>
                            <div className="doc-title-line"></div>
                          </div>

                          {/* Metadata 2-column Grid */}
                          <div className="meta-grid-2col">
                            <div className="meta-col">
                              <div>
                                <div className="meta-label">INVOICE NO.</div>
                                <div className="meta-value font-mono">{currentActiveReceipt.id}</div>
                              </div>
                              <div className="mt-2">
                                <div className="meta-label">BILLED TO</div>
                                <div className="meta-value">{currentActiveReceipt.customerName.toUpperCase()}</div>
                              </div>
                            </div>

                            <div className="meta-col text-right">
                              <div>
                                <div className="meta-label">DATE</div>
                                <div className="meta-value">{new Date(currentActiveReceipt.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                              </div>
                              <div className="mt-2">
                                <div className="meta-label">PHONE</div>
                                <div className="meta-value">{currentActiveReceipt.customerPhone && currentActiveReceipt.customerPhone !== "N/A" ? currentActiveReceipt.customerPhone : "N/A"}</div>
                              </div>
                            </div>
                          </div>

                          {/* Modern Table Grid */}
                          <table className="modern-receipt-table">
                            <thead>
                              <tr>
                                <th style={{ width: "8%", textAlign: "center" }}>S.NO</th>
                                <th style={{ width: "52%" }}>PARTICULARS</th>
                                <th style={{ width: "10%", textAlign: "center" }}>QTY</th>
                                <th style={{ width: "14%", textAlign: "right" }}>RATE</th>
                                <th style={{ width: "16%", textAlign: "right" }}>AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentActiveReceipt.items.map((item, idx) => {
                                const lineTotal = item.price * item.qty;
                                return (
                                  <tr key={idx}>
                                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                    <td className="font-semibold">{item.name}</td>
                                    <td style={{ textAlign: "center" }} className="font-mono">{item.qty}</td>
                                    <td style={{ textAlign: "right" }} className="font-mono">₹{item.price.toFixed(2)}</td>
                                    <td style={{ textAlign: "right" }} className="font-mono font-bold">₹{lineTotal.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              <tr className="total-summary-row">
                                <td colSpan="2" style={{ textAlign: "left", paddingLeft: "12px" }}>Total</td>
                                <td style={{ textAlign: "center" }} className="font-mono">{currentActiveReceipt.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                                <td colSpan="2" style={{ textAlign: "right" }} className="font-mono">₹{currentActiveReceipt.subtotal.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Grand Total Pill Badge */}
                          <div className="grand-total-pill-container">
                            <div className="grand-total-pill">
                              <span className="grand-total-pill-label">
                                {currentActiveReceipt.isQuotation ? "GRAND TOTAL (EST.)" : "GRAND TOTAL (INCL. TAX)"}
                              </span>
                              <span className="grand-total-pill-val font-mono">
                                ₹{currentActiveReceipt.total.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Footer Cards: Bank Details (Left) & Scan & Pay (Right) */}
                          <div className="footer-cards-grid">
                            <div className="footer-card">
                              <div className="footer-card-title">BANK ACCOUNT DETAILS</div>
                              <div className="footer-card-body">
                                <div><strong>Account Name:</strong> {shopName.toUpperCase()}</div>
                                <div><strong>Bank Name:</strong> CANARA BANK</div>
                                <div><strong>A/C No:</strong> 120033287950</div>
                                <div><strong>IFSC Code:</strong> CNRB0010700</div>
                              </div>
                            </div>

                            <div className="footer-card text-center">
                              <div className="footer-card-title">SCAN & PAY (UPI)</div>
                              <div className="footer-card-body">
                                <div className="text-[7.5px] mt-1">UPI ID: {currentActiveReceipt.isGstBilling !== false ? "9845757296@cnrb" : "6361037157@ybl"}</div>
                                <div className="font-bold text-xs text-[#034b54] mt-1 font-mono">₹{currentActiveReceipt.total.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Signature & Tagline */}
                          <div className="bottom-sign-row">
                            <div className="bottom-thankyou">Thank you, visit again.</div>
                            <div className="bottom-sig-box">
                              <div className="bottom-sig-line"></div>
                              <div className="bottom-sig-text">Authorized Signature</div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-slate-950 px-6 py-4 flex flex-col gap-2 border-t border-slate-900">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const pdfUrl = activePdfUrl;
                        fetch(pdfUrl)
                          .then(res => res.blob())
                          .then(blob => {
                            const blobUrl = URL.createObjectURL(blob);
                            let iframe = document.getElementById("print-iframe");
                            if (!iframe) {
                              iframe = document.createElement("iframe");
                              iframe.id = "print-iframe";
                              iframe.style.position = "fixed";
                              iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
                              document.body.appendChild(iframe);
                            }
                            iframe.src = blobUrl;
                            iframe.onload = () => {
                              setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 200);
                            };
                          });
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 text-xs"
                    >
                      <FaPrint /> Print {currentActiveReceipt.isQuotation ? "Quotation" : "Tax Invoice"}
                    </button>
                    <a
                      href={`${activePdfUrl}&download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 text-xs"
                    >
                      <FaDownload /> Download {currentActiveReceipt.isQuotation ? "Quotation PDF" : "Tax Invoice PDF"}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setReceiptData(null);
                        setQuotationReceiptData(null);
                        setCustomInvoiceDate(new Date().toISOString().split("T")[0]);
                      }}
                      className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-xs transition"
                    >
                      Next Customer
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* ADD MANUAL/CUSTOM ITEM MODAL */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs">
                <span className="text-orange-500 font-extrabold">+</span> Add Custom Ad-hoc Item
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddManualModal(false)} 
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleAddManualItemSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Item Name / Description *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Cable Wire 2m"
                  value={manualItemForm.name}
                  onChange={(e) => setManualItemForm({ ...manualItemForm, name: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Unit Price (₹) *</label>
                  <input 
                    type="number" required step="0.01" min="0.01"
                    placeholder="Rate"
                    value={manualItemForm.price}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, price: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Quantity *</label>
                  <input 
                    type="number" required min="1"
                    value={manualItemForm.qty}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, qty: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">GST Rate (%)</label>
                <select 
                  value={manualItemForm.gstRate}
                  onChange={(e) => setManualItemForm({ ...manualItemForm, gstRate: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                </select>
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input 
                  type="checkbox"
                  id="addToRevenue"
                  checked={manualItemForm.addToRevenue}
                  onChange={(e) => setManualItemForm({ ...manualItemForm, addToRevenue: e.target.checked })}
                  className="w-4 h-4 text-orange-500 bg-slate-950 border-slate-850 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="addToRevenue" className="text-slate-350 font-semibold cursor-pointer">
                  Add to Real Revenue
                </label>
              </div>

              <div className="pt-3 flex gap-2.5 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowAddManualModal(false)}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs">
                <FaUser size={12} className="text-orange-500" /> Quick Add Customer Profile
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddCustModal(false)} 
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Customer Name *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Acme Corp"
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Phone Number *</label>
                <input 
                  type="text" required
                  placeholder="10 digit number"
                  value={newCustForm.phone}
                  onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Type</label>
                  <select 
                    value={newCustForm.customerType}
                    onChange={(e) => handleQuickAddCustTypeChange(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Shop">Shop</option>
                    <option value="School">School</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Dealer">Dealer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Price Category</label>
                  <select 
                    value={newCustForm.priceCategory}
                    onChange={(e) => setNewCustForm({ ...newCustForm, priceCategory: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 capitalize"
                  >
                    <option value="retail">retail price</option>
                    <option value="shop">shop price</option>
                    <option value="school">school price</option>
                    <option value="wholesale">wholesale price</option>
                    <option value="dealer">dealer price</option>
                    <option value="distributor">distributor price</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowAddCustModal(false)}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EXCHANGE & RETURN MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                🔄 Return / Exchange Item Wizard
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedInvoiceForReturn(null);
                  setReturnSearchResults([]);
                  setReturnSearchQuery("");
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {!selectedInvoiceForReturn ? (
                <div className="space-y-4">
                  <p className="text-slate-400">Search for the original purchase invoice using the Invoice Number, Customer Name, or Customer Mobile number:</p>
                  
                  <form onSubmit={handleReturnSearchSubmit} className="flex gap-2">
                    <input 
                      type="text"
                      required
                      placeholder="e.g. INV-2026-0001, John, 9845..."
                      value={returnSearchQuery}
                      onChange={(e) => setReturnSearchQuery(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <button 
                      type="submit"
                      disabled={returnLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow text-xs"
                    >
                      {returnLoading ? <FaSpinner className="animate-spin" /> : <IoSearch />} Search
                    </button>
                  </form>

                  <div className="border border-slate-850 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-slate-950/20">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-slate-450 border-b border-slate-850 uppercase text-[9px] font-bold">
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3 text-right">Total Amount</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 text-slate-350">
                        {returnSearchResults.map((inv) => (
                          <tr key={inv._id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-bold text-slate-100">{inv.invoiceId}</td>
                            <td className="p-3">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-200">{inv.customerName}</span>
                              <span className="text-[10px] text-slate-500 ml-2">({inv.customerPhone})</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold border border-slate-800">
                                {inv.paymentMethod}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100">₹{inv.total.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectInvoiceForReturn(inv)}
                                className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded text-[10px] font-bold transition"
                              >
                                Select Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                        {returnSearchResults.length === 0 && !returnLoading && (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500">No invoices matched your query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 flex flex-wrap justify-between gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Invoice Details</p>
                      <p className="text-sm font-bold text-slate-100 mt-1 font-mono">{selectedInvoiceForReturn.invoiceId}</p>
                      <p className="text-slate-400 mt-0.5">Date: {new Date(selectedInvoiceForReturn.date).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Customer Info</p>
                      <p className="text-sm font-bold text-slate-100 mt-1">{selectedInvoiceForReturn.customerName}</p>
                      <p className="text-slate-400 mt-0.5">Phone: {selectedInvoiceForReturn.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Payment mode</p>
                      <p className="text-sm font-bold text-orange-400 mt-1">{selectedInvoiceForReturn.paymentMethod}</p>
                      <p className="text-slate-450 mt-0.5">Total Bill: ₹{selectedInvoiceForReturn.total.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForReturn(null)}
                      className="px-2 py-1 h-fit bg-slate-800 text-slate-300 rounded font-semibold border border-slate-700 hover:bg-slate-700 self-center"
                    >
                      Change Invoice
                    </button>
                  </div>

                  <p className="font-bold text-slate-350">Select items to return &amp; adjust:</p>
                  
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-slate-450 border-b border-slate-850 uppercase text-[9px] font-bold">
                          <th className="p-3">Product Name</th>
                          <th className="p-3 text-center">Purchased Qty</th>
                          <th className="p-3 text-center">Returned Qty</th>
                          <th className="p-3 text-center">Returnable Qty</th>
                          <th className="p-3 text-center" style={{ width: "120px" }}>Qty to Return</th>
                          <th className="p-3 text-center">Mark Defective?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 text-slate-300">
                        {selectedInvoiceForReturn.items.map((item) => {
                          const key = item.productId || item.name;
                          const returned = item.returnedQty || 0;
                          const returnable = item.qty - returned;
                          
                          return (
                            <tr key={key}>
                              <td className="p-3">
                                <p className="font-semibold text-slate-100">{item.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">Rate: ₹{item.price.toFixed(2)} (GST: {item.gstRate || 0}%)</p>
                              </td>
                              <td className="p-3 text-center font-mono">{item.qty}</td>
                              <td className="p-3 text-center font-mono text-rose-450">{returned}</td>
                              <td className="p-3 text-center font-mono font-bold text-emerald-450">{returnable}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={returnable}
                                  value={returnQuantities[key] || 0}
                                  onChange={(e) => {
                                    const val = Math.min(returnable, Math.max(0, parseInt(e.target.value) || 0));
                                    setReturnQuantities({ ...returnQuantities, [key]: val });
                                  }}
                                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-bold text-xs focus:outline-none focus:border-orange-500"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input 
                                  type="checkbox"
                                  checked={!!returnDefects[key]}
                                  onChange={(e) => setReturnDefects({ ...returnDefects, [key]: e.target.checked })}
                                  className="w-4 h-4 text-orange-500 bg-slate-950 border-slate-800 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-900 justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedInvoiceForReturn(null);
                        setReturnSearchResults([]);
                        setReturnSearchQuery("");
                      }}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white border border-slate-700 rounded-xl font-bold text-xs"
                    >
                      Reset selection
                    </button>
                    <button 
                      type="button"
                      onClick={handleConfirmReturnExchange}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/10 text-xs"
                    >
                      Apply Return items to Bill
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default POS;
