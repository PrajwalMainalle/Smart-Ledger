import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { IoSearch } from "react-icons/io5";
import { MdDeleteOutline, MdClear } from "react-icons/md";
import { FaUser, FaPhoneAlt, FaCalculator, FaBarcode, FaCheckCircle, FaPrint, FaTimes, FaSpinner, FaDownload, FaCalendarAlt, FaEdit, FaExclamationTriangle } from "react-icons/fa";
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
import { downloadPdfFile } from "../../../utils/downloadHelper";
import GovFundVoucherModal from "../../gov-funds/components/GovFundVoucherModal";


function POS() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Selectors
  const { products, loading: productsLoading } = useSelector((state) => state.inventory);
  const { customers } = useSelector((state) => state.customers);
  const { cart, customerName, customerPhone, customerGstNumber, customerType, priceCategory, paymentMethod, loading: checkoutLoading } = useSelector((state) => state.billing);
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
  const [modalPreviewMode, setModalPreviewMode] = useState("summary"); // "summary" | "pdf"
  const [mobilePosTab, setMobilePosTab] = useState("catalog"); // "catalog" | "cart"

  // Credit Outstanding & Return Exchange states
  const [amountPaidToday, setAmountPaidToday] = useState(0);
  const [creditReminderDays, setCreditReminderDays] = useState(20);
  const [returnedItems, setReturnedItems] = useState([]);
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  useEffect(() => {
    const foundCust = customers.find((c) => c.phone === customerPhone);
    if (foundCust && foundCust.creditReminderDays && foundCust.creditReminderDays > 0) {
      setCreditReminderDays(foundCust.creditReminderDays);
    } else if (user?.creditReminderDays) {
      setCreditReminderDays(user.creditReminderDays);
    } else {
      setCreditReminderDays(20);
    }
  }, [customerPhone, customers, user]);

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
  const [govTxType, setGovTxType] = useState("Material Issue");
  const [govCashWithdrawnAmount, setGovCashWithdrawnAmount] = useState(0);
  const [govTeacherName, setGovTeacherName] = useState("");
  const [govTeacherMobile, setGovTeacherMobile] = useState("");
  const [govTeacherDesignation, setGovTeacherDesignation] = useState("");
  const [govRemarks, setGovRemarks] = useState("");
  const [showGovVoucherModal, setShowGovVoucherModal] = useState(false);
  const [govVoucherData, setGovVoucherData] = useState(null);
  const [govCheckoutLoading, setGovCheckoutLoading] = useState(false);

  // Resizable Side Panel State
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("pos_cart_panel_width");
    return saved ? parseInt(saved, 10) : 384;
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const container = document.getElementById("pos-main-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = Math.max(340, Math.min(680, rect.right - e.clientX));
      setPanelWidth(newWidth);
      localStorage.setItem("pos_cart_panel_width", newWidth.toString());
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (paymentMethod === "Government School Fund") {
      axiosInstance.get("/gov-funds/schools").then((res) => setGovSchoolsList(res.data)).catch(console.error);
      axiosInstance.get("/gov-funds/funds").then((res) => setGovGrantsList(res.data)).catch(console.error);
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
          const itemProdId = (item.productId?._id || item.productId || item.id)?.toString();
          const prod = products.find(p => p._id?.toString() === itemProdId);
          const currentStock = prod ? prod.stock : 0;
          return {
            id: itemProdId || item.productId,
            productId: itemProdId || item.productId,
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
      customerGstNumber: inv.customerGstNumber || inv.customerGst || "",
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

    // Government School Fund Payment Method Handler (Module 2: Fund Utilization - NO Sales Invoice Created!)
    if (paymentMethod === "Government School Fund") {
      if (!selectedGovSchoolId) {
        alert("Please select a Government School.");
        return;
      }
      if (!selectedGovGrantId) {
        alert("Please select an Active Government Fund Account.");
        return;
      }

      const selectedFund = govGrantsList.find(f => f._id === selectedGovGrantId);
      const materialTotal = grandTotal;
      const cashVal = Number(govCashWithdrawnAmount) || 0;
      const totalVal = materialTotal + cashVal;

      if (totalVal <= 0) {
        alert("Please add materials to cart or enter a valid Cash Withdrawal amount.");
        return;
      }

      if (selectedFund && totalVal > selectedFund.remainingBalance) {
        alert(`Transaction total (₹${totalVal.toFixed(2)}) exceeds remaining fund balance (₹${selectedFund.remainingBalance.toFixed(2)}).`);
        return;
      }

      setGovCheckoutLoading(true);
      axiosInstance.post("/gov-funds/utilize", {
        schoolId: selectedGovSchoolId,
        grantId: selectedGovGrantId,
        type: govTxType || (materialTotal > 0 && cashVal > 0 ? "Material + Cash Withdrawal" : (materialTotal > 0 ? "Material Issue" : "Cash Withdrawal")),
        items: checkoutItems,
        cashWithdrawnAmount: cashVal,
        teacherDetails: {
          name: govTeacherName,
          mobile: govTeacherMobile,
          designation: govTeacherDesignation,
          remarks: govRemarks,
        },
        remarks: govRemarks,
      })
      .then((res) => {
        setGovCheckoutLoading(false);
        setGovVoucherData(res.data.voucher);
        setShowGovVoucherModal(true);
        dispatch(clearCart());
        dispatch(fetchProducts());
        setDiscountValue(0);
        setGovCashWithdrawnAmount(0);
        setGovRemarks("");
        axiosInstance.get("/gov-funds/funds").then((fRes) => setGovGrantsList(fRes.data)).catch(console.error);
      })
      .catch((err) => {
        setGovCheckoutLoading(false);
        alert(err.response?.data?.message || "Failed to process Government Fund utilization");
      });
      return;
    }

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
        creditReminderDays: paymentMethod === "Credit" ? creditReminderDays : null,
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
            paymentMethod: "N/A",
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
            paymentMethod: isQuotation ? "N/A" : paymentMethod,
            items: checkoutItems,
            isGstBilling: isQuotation ? true : isGstBilling,
            amountPaid: isQuotation ? 0 : (paymentMethod === "Credit" ? amountPaidToday : (paymentMethod === "Split" ? (cashAmount + upiAmount) : (paymentMethod === "Exchange" ? 0 : grandTotal))),
            creditReminderDays: paymentMethod === "Credit" ? creditReminderDays : null,
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
          paymentMethod: isQuotation ? "N/A" : paymentMethod,
          items: checkoutItems,
          isGstBilling: isQuotation ? true : isGstBilling,
          amountPaid: isQuotation ? 0 : (paymentMethod === "Credit" ? amountPaidToday : (paymentMethod === "Split" ? (cashAmount + upiAmount) : (paymentMethod === "Exchange" ? 0 : grandTotal))),
          creditReminderDays: paymentMethod === "Credit" ? creditReminderDays : null,
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

  const handleEditBillInPOS = (invoiceToEdit) => {
    if (!invoiceToEdit) return;

    const restoredCart = invoiceToEdit.items.map((item) => {
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
          isManualItem: true,
          excludeFromRevenue: !!item.excludeFromRevenue,
        };
      } else {
        const itemProdId = (item.productId?._id || item.productId || item.id)?.toString();
        const prod = products.find((p) => p._id?.toString() === itemProdId);
        const currentStock = prod ? prod.stock : 0;
        return {
          id: itemProdId || item.productId,
          productId: itemProdId || item.productId,
          name: item.name,
          price: item.price,
          originalPrice: prod ? prod.price : item.price,
          prices: prod ? prod.prices : {},
          priceCategoryUsed: item.priceCategoryUsed || "retail",
          qty: item.qty,
          gstRate: item.gstRate || 0,
          sku: item.sku,
          maxStock: currentStock + item.qty,
          isManualItem: false,
        };
      }
    });

    dispatch(
      restoreCartAndBillingState({
        cart: restoredCart,
        customerName: invoiceToEdit.customerName,
        customerPhone: invoiceToEdit.customerPhone,
        customerType: invoiceToEdit.customerType || "Retail",
        priceCategory: invoiceToEdit.priceCategory || "retail",
        discount: invoiceToEdit.discountPercent || 0,
        paymentMethod: invoiceToEdit.paymentMethod || "Cash",
      })
    );

    setDiscountValue(invoiceToEdit.discountPercent || 0);
    setDiscountType("percent");
    setIsGstBilling(invoiceToEdit.isGstBilling !== false);
    setIsQuotation(invoiceToEdit.isQuotation || false);
    if (invoiceToEdit.date) {
      setCustomInvoiceDate(new Date(invoiceToEdit.date).toISOString().split("T")[0]);
    }
    setEditingInvoiceId(invoiceToEdit._id);
    setEditingInvoiceNumber(invoiceToEdit.invoiceId);
    setCustomerSearch(invoiceToEdit.customerName === "Walk-in Customer" ? "" : invoiceToEdit.customerName);

    if (invoiceToEdit.paymentMethod === "Credit") {
      setAmountPaidToday(invoiceToEdit.amountPaid || 0);
    } else if (invoiceToEdit.paymentMethod === "Split") {
      setCashAmount(invoiceToEdit.cashAmount || 0);
      setUpiAmount(invoiceToEdit.upiAmount || 0);
    }

    setShowCheckoutModal(false);
    setReceiptData(null);
    setQuotationReceiptData(null);
  };

  const handleEditCurrentBill = () => {
    if (receiptData) {
      handleEditBillInPOS(receiptData);
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

  const handleDownloadPosPdf = (receipt = currentActiveReceipt || receiptData) => {
    if (!receipt?._id) return;
    const isQuotation = receipt.isQuotation || receipt.status === "Quotation";
    const prefix = isQuotation ? "Quotation" : "Invoice";
    const filename = `${prefix}_${receipt.invoiceId || receipt._id}.pdf`;
    const serverUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000";
    const token = authStoreToken || user?.token || "";
    const pdfUrl = `${serverUrl}/api/billing/${receipt._id}/pdf?pageSize=${pageSize}&orientation=${orientation}&token=${token}&download=true&t=${Date.now()}`;
    downloadPdfFile(pdfUrl, filename);
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
  const shopName = profile.shopName || user?.businessName || "Smart Ledger";
  const address = profile.businessAddress || "";
  const gstNumber = profile.gstNumber || "";
  const isCurrentGst = currentActiveReceipt ? (currentActiveReceipt.isGstBilling !== false) : isGstBilling;
  const contactPhone = profile.mobileNumber || user?.mobileNumber || "";
  const logoSrc = profile.logo || logo;

  return (
    <div 
      id="pos-main-container"
      className="flex flex-col xl:flex-row bg-slate-950 text-slate-100 h-[calc(100dvh-120px)] xl:h-[calc(100vh-110px)] min-h-[500px] rounded-2xl border border-slate-900 overflow-hidden relative select-none"
    >
      
      {checkoutLoading && <LoadingOverlay message="Processing invoice transaction..." />}

      {editingInvoiceId && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 font-bold z-40 backdrop-blur-md shadow-lg">
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-black text-[10px] uppercase tracking-wider">EDIT MODE</span>
            Editing Bill: <span className="font-mono text-white underline font-extrabold">{editingInvoiceNumber}</span>. Add/remove items, change quantities or pricing, then click <strong>"Save & Update Bill"</strong>.
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingInvoiceId(null);
              setEditingInvoiceNumber("");
              dispatch(clearCart());
            }}
            className="px-3 py-1 bg-slate-900/80 hover:bg-rose-600/80 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold transition"
          >
            Cancel Edit & Clear Cart
          </button>
        </div>
      )}

      {/* MOBILE POS DUAL TAB NAVIGATION (< xl breakpoint) */}
      <div className="xl:hidden flex bg-slate-900 border-b border-slate-800 p-2 gap-2 shrink-0 sticky top-0 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setMobilePosTab("catalog")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            mobilePosTab === "catalog"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800"
          }`}
        >
          <FaBarcode className="text-sm" />
          <span>1. Products Catalog</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab("cart")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            mobilePosTab === "cart"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800"
          }`}
        >
          <FaCalculator className="text-sm" />
          <span>2. Bill & Checkout ({cart.length})</span>
          {cart.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-950 text-orange-400 rounded-full font-mono text-[10px] font-extrabold border border-orange-500/30">
              ₹{grandTotal}
            </span>
          )}
        </button>
      </div>

      {/* LEFT: PRODUCTS BROWSER */}
      <div className={`flex-1 p-4 md:p-6 pb-28 md:pb-6 space-y-6 flex flex-col h-full min-h-0 overflow-y-auto ${mobilePosTab === "catalog" ? "flex" : "hidden xl:flex"}`}>
        
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
                    <h4 className="font-bold text-slate-100 text-sm line-clamp-1 group-hover:text-orange-500 transition-colors notranslate" translate="no">{product.name}</h4>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold tracking-tight border border-slate-700">{product.sku}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{product.description || "No description provided."}</p>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Rate Cost</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{product.price.toFixed(2)}</span>
                  </div>
                  
                  {outOfStock ? (
                    <span className="text-xs font-bold text-rose-500">Out of Stock</span>
                  ) : remainingStock <= 0 ? (
                    <span className="text-xs font-bold text-amber-500">Limit Reached</span>
                  ) : (
                    <div className="text-[10px] text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-750">
                      Stock: <span className="font-bold text-slate-100">{remainingStock}</span>
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

      {/* DRAGGABLE RESIZE DIVIDER (Desktop) */}
      <div 
        onMouseDown={() => setIsDragging(true)}
        className={`hidden xl:flex w-2.5 bg-slate-900 hover:bg-orange-500/40 cursor-col-resize items-center justify-center transition-colors group select-none border-x border-slate-800/80 ${isDragging ? "bg-orange-500" : ""}`}
        title="Click and drag to slide/resize Cart Panel width"
      >
        <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-white transition-colors"></div>
      </div>

      {/* RIGHT: CART AND CHECKOUT LOGIC */}
      <div 
        id="pos-cart-panel"
        style={typeof window !== "undefined" && window.innerWidth >= 1280 ? { width: `${panelWidth}px` } : {}}
        className={`w-full xl:w-auto bg-slate-900 border-t xl:border-t-0 border-slate-800 p-4 md:p-6 pb-28 md:pb-6 flex flex-col h-full min-h-0 overflow-y-auto space-y-6 shrink-0 transition-all duration-75 ${mobilePosTab === "cart" ? "flex" : "hidden xl:flex"}`}
      >
        
        {/* Customer logging */}
        <div className="space-y-3 relative">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Customer Details</h3>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => {
                  const next = panelWidth >= 500 ? 384 : 540;
                  setPanelWidth(next);
                  localStorage.setItem("pos_cart_panel_width", next.toString());
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-700 font-bold transition hidden xl:inline-block"
                title="Toggle compact (384px) or wide (540px) cart panel view"
              >
                {panelWidth >= 500 ? "↔️ Compact" : "↔️ Expand"}
              </button>
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
                  className="text-[10px] text-rose-500 hover:text-rose-400 font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search registered customers by name/phone..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustDropdown(true);
              }}
              onFocus={() => setShowCustDropdown(true)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
            <IoSearch size={14} className="absolute left-3 top-2.5 text-slate-400" />
            
            {showCustDropdown && customerSearch.trim() !== "" && (() => {
              const matchedCustomers = customers.filter(c => {
                if (!c) return false;
                const name = c.name || "";
                const phone = c.phone || "";
                return name.toLowerCase().includes(customerSearch.toLowerCase()) || phone.includes(customerSearch);
              });

              return (
                <div className="absolute left-0 right-0 mt-1 z-30 bg-slate-900 border border-slate-700 rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-slate-800">
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
                      className="p-2.5 hover:bg-slate-800 cursor-pointer text-left text-xs text-slate-100"
                    >
                      <div className="font-bold text-slate-100">{cust.name}</div>
                      <div className="text-[10px] text-slate-400 flex justify-between mt-0.5 font-medium">
                        <span>📞 {cust.phone}</span>
                        <span className="text-orange-500 font-bold">{cust.customerType} ({cust.priceCategory})</span>
                      </div>
                    </div>
                  ))}
                  {matchedCustomers.length === 0 && (
                    <div className="p-2.5 text-center text-slate-400 text-xs font-medium">No customer profiles found.</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Current selected customer details panel - Direct Editable Inline Inputs */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs shadow-sm">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-bold min-w-[75px]">Name:</span>
              <input 
                type="text"
                placeholder="Walk-in Customer"
                value={customerName === "Walk-in Customer" ? "" : customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  dispatch(setCustomerInfo({
                    name: val.trim() === "" ? "Walk-in Customer" : val,
                    phone: customerPhone,
                    customerType,
                    priceCategory
                  }));
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-bold text-slate-100 text-xs focus:outline-none focus:border-orange-500 placeholder-slate-500 truncate"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-bold min-w-[75px]">Phone:</span>
              <input 
                type="text"
                placeholder="N/A"
                value={customerPhone === "N/A" ? "" : customerPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  dispatch(setCustomerInfo({
                    name: customerName,
                    phone: val.trim() === "" ? "N/A" : val,
                    customerGstNumber,
                    customerType,
                    priceCategory
                  }));
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono font-bold text-slate-100 text-xs focus:outline-none focus:border-orange-500 placeholder-slate-500"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-bold min-w-[75px]">GSTIN:</span>
              <input 
                type="text"
                placeholder="GSTIN (Optional)"
                value={customerGstNumber || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  dispatch(setCustomerInfo({
                    name: customerName,
                    phone: customerPhone,
                    customerGstNumber: val.trim().toUpperCase(),
                    customerType,
                    priceCategory
                  }));
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono font-bold text-slate-100 text-xs focus:outline-none focus:border-orange-500 placeholder-slate-500 uppercase"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-bold min-w-[75px]">Pricing Tier:</span>
              <select
                value={priceCategory ? priceCategory.toLowerCase() : "retail"}
                onChange={(e) => {
                  const newTier = e.target.value;
                  const typeMapping = {
                    retail: "Retail",
                    shop: "Shop",
                    school: "School",
                    wholesale: "Wholesale",
                    dealer: "Dealer",
                    distributor: "Distributor"
                  };
                  dispatch(setCustomerInfo({
                    name: customerName,
                    phone: customerPhone,
                    customerType: typeMapping[newTier] || (newTier ? newTier.charAt(0).toUpperCase() + newTier.slice(1) : "Retail"),
                    priceCategory: newTier
                  }));
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-bold text-orange-500 text-xs focus:outline-none focus:border-orange-500 cursor-pointer capitalize"
              >
                <option value="retail">Retail Price</option>
                <option value="shop">Shop Price</option>
                <option value="school">School Price</option>
                <option value="wholesale">Wholesale Price</option>
                <option value="dealer">Dealer Price</option>
                <option value="distributor">Distributor Price</option>
                {priceCategory && !["retail", "shop", "school", "wholesale", "dealer", "distributor"].includes(priceCategory.toLowerCase()) && (
                  <option value={priceCategory.toLowerCase()}>{priceCategory} Price</option>
                )}
              </select>
            </div>
          </div>
        </div>
              {/* Cart items list */}
        <div className="flex-1 flex flex-col min-h-[200px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2 flex justify-between">
            <span>Bill items</span>
            <span className="text-slate-400 font-bold">({cart.length} unique)</span>
          </h3>

          <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto max-h-[250px] mt-2 pr-1 space-y-2">
            {cart.map((item) => {
              const exceedsStock = item.qty > item.maxStock;
              return (
                <div key={item.id} className="py-2.5 flex flex-col justify-center text-xs gap-1.5 border-b border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100 truncate notranslate text-left flex items-center gap-1.5" translate="no">
                        {item.name}
                        {item.isManualItem && (
                          <span className="px-1.5 py-0.2 bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded text-[8px] font-black uppercase tracking-wider">
                            Manual
                          </span>
                        )}
                        {item.excludeFromRevenue && (
                          <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-[8px] font-black uppercase tracking-wider">
                            Non-Revenue
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-semibold">
                        <span className="capitalize">{item.priceCategoryUsed || "retail"} Price: ₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            dispatch(updateCartItemPrice({ id: item.id, price: newPrice }));
                          }}
                          className="w-16 h-5 bg-slate-900 border border-slate-700 rounded px-1 text-[10px] text-orange-500 font-bold focus:outline-none focus:border-orange-500 font-mono text-center"
                        />
                        <span className="text-slate-400 font-bold">| GST: {item.gstRate}%</span>
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
                        className="w-6 h-6 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-orange-500 text-slate-200 flex items-center justify-center font-bold text-xs select-none transition"
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
                        className={`w-12 h-6 text-center font-black bg-slate-900 border rounded text-xs text-slate-100 focus:outline-none focus:border-orange-500
                          ${exceedsStock ? "border-rose-500 text-rose-500 focus:border-rose-500" : "border-slate-700"}
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
                        className="w-6 h-6 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-orange-500 text-slate-200 flex items-center justify-center font-bold text-xs select-none transition"
                        title="Increase Quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right pl-1 min-w-[70px]">
                      <p className="font-black text-slate-100 font-mono text-xs">₹{(item.price * item.qty).toFixed(2)}</p>
                      <button 
                        onClick={() => dispatch(removeFromCart(item.id))}
                        className="text-slate-400 hover:text-rose-500 transition-colors mt-0.5"
                        title="Remove item"
                      >
                        <MdDeleteOutline size={16} />
                      </button>
                    </div>
                  </div>

                  {exceedsStock && (
                    <div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 flex items-center justify-between">
                      <span>⚠️ Exceeds stock</span>
                      <span>Max available: {item.maxStock}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {returnedItems.length > 0 && (
              <div className="mt-4 space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block text-left">Returned Items Adjustment</span>
                {returnedItems.map((item, idx) => (
                  <div key={`ret_${idx}`} className="bg-slate-900 border border-rose-500/30 rounded-xl p-3 space-y-2 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-rose-400 truncate notranslate" translate="no">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold truncate">Invoice: {item.originalInvoiceId} {item.isDefective ? "(Defective)" : "(Reusable)"}</p>
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
                      <span className="text-[10px] text-slate-300 font-mono font-semibold">Qty: {item.qty} @ ₹{item.price.toFixed(2)}</span>
                      <span className="font-black text-rose-500 font-mono">-₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length === 0 && returnedItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400">
                <FaCalculator className="text-3xl mb-2 text-slate-500" />
                <p className="text-xs font-bold">Cart is empty.</p>
                <p className="text-[10px] text-slate-400 font-medium">Click products on left to build bill.</p>
              </div>
            )}
          </div>
        </div>

        {/* Calculations breakdown */}
        <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs shadow-sm">
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Cart Subtotal</span>
            <span className="font-black text-slate-100 font-mono text-xs">₹{subtotal.toFixed(2)}</span>
          </div>

          {returnedItems.length > 0 && (
            <div className="flex justify-between text-rose-500 font-bold border-b border-slate-800 pb-1">
              <span>Returns Deduct (with Tax)</span>
              <span className="font-mono font-black">-₹{returnedTotalWithTax.toFixed(2)}</span>
            </div>
          )}

          {/* Dynamic manual discount settings */}
          <div className="space-y-2 py-1 border-t border-b border-slate-800 my-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Discount type:</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => { setDiscountType("percent"); setDiscountValue(0); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition
                    ${discountType === "percent" ? "bg-orange-500 text-white border-transparent shadow-sm" : "bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100"}
                  `}
                >
                  % Percent
                </button>
                <button 
                  type="button"
                  onClick={() => { setDiscountType("fixed"); setDiscountValue(0); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition
                    ${discountType === "fixed" ? "bg-orange-500 text-white border-transparent shadow-sm" : "bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100"}
                  `}
                >
                  ₹ Fixed
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Enter Discount Value:</span>
              <input 
                type="number"
                min="0"
                max={discountType === "percent" ? "100" : subtotal}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-black font-mono text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Discount Amount</span>
            <span className="font-black text-rose-500 font-mono">-₹{discountAmt.toFixed(2)}</span>
          </div>

          {!isInclusiveGst && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">CGST (Central Tax)</span>
                <span className="font-bold text-slate-200 font-mono">₹{(gstAmt / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">SGST (State Tax)</span>
                <span className="font-bold text-slate-200 font-mono">₹{(gstAmt / 2).toFixed(2)}</span>
              </div>
            </>
          )}

          {isInclusiveGst && (
            <div className="flex justify-between text-[11px] text-emerald-500 font-bold items-center">
              <span>GST (Included in Prices)</span>
              <span className="font-mono font-black">₹{gstAmt.toFixed(2)}</span>
            </div>
          )}

          {Math.abs(roundOff) >= 0.01 && (
            <div className="flex justify-between text-xs text-slate-400 font-bold items-center">
              <span>Round Off</span>
              <span className="font-mono">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
            </div>
          )}

          <div className="h-px bg-slate-800 my-2"></div>

          <div className="flex justify-between items-end pt-1">
            <span className="text-sm font-extrabold text-slate-100">
              Grand Total {isInclusiveGst && <span className="text-[10px] text-slate-400 font-bold block">(Inclusive of all taxes)</span>}
            </span>
            <span className="text-lg font-black text-orange-500 font-mono">₹{grandTotal.toFixed(2)}</span>
          </div>

        </div>

        {/* Payment mode choice */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">Payment Method</span>
          {isQuotation ? (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 font-semibold shadow-sm">
              <span className="text-amber-400 font-extrabold block mb-0.5">📋 Quotation / Estimate Mode</span>
              No payment method required for quotations.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const baseMethods = ["Cash", "UPI", "Cheque", "Credit", "Split", "Government School Fund"];
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
                          ? "bg-slate-900 border-orange-500 text-orange-500 font-black shadow-md" 
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600"
                        }
                      `}
                    >
                      {method}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {paymentMethod === "Government School Fund" && (
          <div className="bg-slate-900/90 p-3 rounded-xl border border-amber-500/40 text-xs space-y-3 text-left shadow-lg">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
              <span className="text-[11px] font-bold uppercase text-amber-400 block tracking-wider flex items-center gap-1.5">
                🏛️ Government Fund Utilization (No Sales Invoice Created)
              </span>
              <span className="text-[9.5px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                Layer 2 Active
              </span>
            </div>

            {/* Select School */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Government School *</label>
              <select
                value={selectedGovSchoolId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedGovSchoolId(sId);
                  const firstFund = govGrantsList.find(f => (f.schoolId?._id === sId || f.schoolId === sId) && ["Fund Active", "Partially Utilized"].includes(f.status));
                  if (firstFund) setSelectedGovGrantId(firstFund._id);
                  else setSelectedGovGrantId("");
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select Government School --</option>
                {govSchoolsList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.schoolName} (HM: {s.headmasterName})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Active Government Fund Account */}
            {selectedGovSchoolId && (
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Active Government Fund Account *</label>
                <select
                  value={selectedGovGrantId}
                  onChange={(e) => setSelectedGovGrantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">-- Select Government Fund Account --</option>
                  {govGrantsList
                    .filter((f) => (f.schoolId?._id === selectedGovSchoolId || f.schoolId === selectedGovSchoolId))
                    .map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.fundNumber} | {f.grantName} ({f.invoiceNumber ? `Ref: ${f.invoiceNumber}` : "Direct"}) - Bal: ₹{(f.remainingBalance || 0).toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Fund Account Details & Live Balance Card */}
            {selectedGovGrantId && (() => {
              const selFund = govGrantsList.find((f) => f._id === selectedGovGrantId);
              if (!selFund) return null;

              const approved = selFund.approvedBudget || 0;
              const materialUtil = selFund.materialUtilized || 0;
              const cashWithdrawn = selFund.cashWithdrawn || 0;
              const remaining = selFund.remainingBalance ?? (approved - materialUtil - cashWithdrawn);
              
              const currentTotal = grandTotal + (Number(govCashWithdrawnAmount) || 0);
              const hasBalance = remaining >= currentTotal;

              return (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Fund Account Number:</span>
                    <span className="font-bold font-mono text-amber-400">{selFund.fundNumber}</span>
                  </div>
                  {selFund.invoiceNumber && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Ref Tax Invoice:</span>
                      <span className="font-mono text-slate-300">{selFund.invoiceNumber}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800 text-[10.5px]">
                    <div>
                      <span className="text-slate-500 block">Approved Budget</span>
                      <span className="font-bold text-slate-200">₹{approved.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Materials Utilized</span>
                      <span className="font-bold text-slate-200">₹{materialUtil.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cash Withdrawn</span>
                      <span className="font-bold text-slate-200">₹{cashWithdrawn.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Remaining Balance</span>
                      <span className={`font-black ${hasBalance ? "text-emerald-400" : "text-red-400"}`}>
                        ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {!hasBalance && (
                    <p className="text-[10px] text-red-400 font-bold pt-1.5 text-center border-t border-red-900/40">
                      ⚠️ Utilization Total (₹{currentTotal.toFixed(2)}) exceeds remaining fund balance!
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Transaction Type Selector */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">Transaction Type</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                {["Material Issue", "Cash Withdrawal", "Material + Cash Withdrawal"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGovTxType(t)}
                    className={`py-1 rounded font-bold text-[9.5px] transition-colors ${
                      govTxType === t
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t === "Material + Cash Withdrawal" ? "Material + Cash" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Withdrawal Input Field */}
            {(govTxType === "Cash Withdrawal" || govTxType === "Material + Cash Withdrawal") && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-500/30">
                <label className="block text-[10px] text-amber-400 font-bold mb-1">
                  💵 Cash Withdrawal Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={govCashWithdrawnAmount}
                  onChange={(e) => setGovCashWithdrawnAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter Cash Withdrawal Amount"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Teacher Info Inputs */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] text-slate-400 font-semibold">Teacher / Receiver Details</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  placeholder="Teacher Name *"
                  value={govTeacherName}
                  onChange={(e) => setGovTeacherName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Mobile Number"
                  value={govTeacherMobile}
                  onChange={(e) => setGovTeacherMobile(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <input
                type="text"
                placeholder="Designation (e.g. Head Master / Asst Teacher)"
                value={govTeacherDesignation}
                onChange={(e) => setGovTeacherDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Remarks / Notes"
                value={govRemarks}
                onChange={(e) => setGovRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

          </div>
        )}

        {paymentMethod === "Credit" && (
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900 text-xs space-y-3 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Amount Paid Today (₹):</span>
              <input 
                type="number"
                min="0"
                max={grandTotal}
                value={amountPaidToday}
                onChange={(e) => setAmountPaidToday(parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-right font-semibold font-mono text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/80">
              <div>
                <span className="text-slate-300 font-bold block">Credit Due / Reminder (Days):</span>
                <span className="text-[10px] text-slate-500">Days before overdue alert triggers for this bill</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number"
                  min="1"
                  max="365"
                  value={creditReminderDays}
                  onChange={(e) => setCreditReminderDays(parseInt(e.target.value, 10) || 1)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-center font-bold font-mono text-orange-400 focus:outline-none focus:border-orange-500"
                />
                <span className="text-[11px] text-slate-400 font-bold">Days</span>
              </div>
            </div>

            {creditReminderDays > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-[10px] text-orange-300 flex items-center justify-between font-mono">
                <span>📅 Overdue Alert Date:</span>
                <strong>
                  {new Date(Date.now() + creditReminderDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                </strong>
              </div>
            )}
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
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5 text-left shadow-sm">
          <div className="flex justify-between items-center">
            <label htmlFor="invoiceDate" className="text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer">
              <FaCalendarAlt className="text-orange-500" /> Invoice Date (DD/MM/YYYY):
            </label>
            {customInvoiceDate !== new Date().toISOString().split("T")[0] && (
              <button
                type="button"
                onClick={() => setCustomInvoiceDate(new Date().toISOString().split("T")[0])}
                className="text-[10px] text-orange-500 hover:underline font-bold"
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
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
          />
        </div>

        {/* GST Billing Toggle */}
        <div className="flex items-center gap-2.5 py-1 select-none">
          <input
            type="checkbox"
            id="isGstBilling"
            checked={isGstBilling}
            onChange={(e) => setIsGstBilling(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-orange-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="isGstBilling" className="text-xs font-bold text-slate-200 cursor-pointer">
            Enable GST Calculation (CGST/SGST)
          </label>
        </div>

        {/* Quotation / Estimate Toggle */}
        <div className="flex items-center gap-2.5 py-1 select-none">
          <input
            type="checkbox"
            id="isQuotation"
            checked={isQuotation}
            onChange={(e) => {
              const val = e.target.checked;
              setIsQuotation(val);
              if (val) {
                setIsGstBilling(true);
              }
            }}
            className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-orange-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="isQuotation" className="text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1.5">
            Generate as Quotation / Estimate <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">(With GSTIN)</span>
          </label>
        </div>

        {/* Dual Mode Indicator */}
        {isGstBilling && isQuotation && (
          <div className="text-[10.5px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2 flex items-center gap-1.5 mt-0.5">
            <span>✨</span>
            <span><strong>Dual Creation:</strong> Creates <strong>Tax Invoice</strong> & <strong>Quotation</strong> simultaneously in 1 click!</span>
          </div>
        )}

        {/* Mandatory Pre-Checkout UPI Configuration Warning */}
        {(() => {
          const isUpiMissing = !isQuotation && (isGstBilling 
            ? (!profile?.gstUpiId || profile.gstUpiId.trim() === "")
            : (!profile?.nonGstUpiId || profile.nonGstUpiId.trim() === ""));
          
          if (!isUpiMissing) return null;

          return (
            <div className="text-[11px] font-bold text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl p-2.5 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-400 flex-shrink-0 text-sm" />
              <span>
                {isGstBilling 
                  ? "GST Billing UPI ID is not configured. Please add your GST UPI ID in Settings before proceeding."
                  : "Non-GST Billing UPI ID is not configured. Please add your Non-GST UPI ID in Settings before proceeding."
                }
              </span>
            </div>
          );
        })()}

        {/* Checkout Button */}
        {(() => {
          const isUpiMissing = !isQuotation && (isGstBilling 
            ? (!profile?.gstUpiId || profile.gstUpiId.trim() === "")
            : (!profile?.nonGstUpiId || profile.nonGstUpiId.trim() === ""));
          
          const isCheckoutDisabled = cart.length === 0 || 
            checkoutLoading || 
            govCheckoutLoading || 
            isUpiMissing || 
            cart.some(item => item.qty > item.maxStock || item.qty <= 0);

          return (
            <button
              onClick={handleCheckout}
              disabled={isCheckoutDisabled}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform transform active:scale-98 text-xs
                ${isCheckoutDisabled
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                }
              `}
            >
              {(checkoutLoading || govCheckoutLoading) ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <>
                  <FaCheckCircle />
                  {editingInvoiceId ? `💾 Save & Update Bill (${editingInvoiceNumber})` : "Proceed to Checkout"}
                </>
              )}
            </button>
          );
        })()}

      </div>

      {/* Floating Sticky Mobile Cart Bar */}
      {cart.length > 0 && (
        <div className="xl:hidden fixed bottom-16 left-3 right-3 z-40 bg-slate-900/95 border border-orange-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom duration-250">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cart Total: <span className="text-orange-400 font-mono font-black">₹{grandTotal.toFixed(2)}</span></p>
              <p className="text-[10px] text-slate-400 font-semibold">{cart.length} item{cart.length > 1 ? "s" : ""} in active bill</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobilePosTab("cart");
              const cartEl = document.getElementById("pos-cart-panel");
              if (cartEl) {
                cartEl.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition"
          >
            <span>View Cart & Checkout</span>
            <span className="text-sm">➔</span>
          </button>
        </div>
      )}

      {/* PRINTABLE INVOICE / CHECKOUT MODAL OVERLAY */}
      {showCheckoutModal && receiptData && (
        (() => {
          const currentActiveReceipt = (activeTabReceipt === "quotation" && quotationReceiptData) 
            ? quotationReceiptData 
            : receiptData;

          const activePdfUrl = `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000"}/api/billing/${currentActiveReceipt._id}/pdf?pageSize=${pageSize}&orientation=${orientation}&token=${authStoreToken || user?.token || ""}&t=${Date.now()}#toolbar=0&navpanes=0&view=FitH`;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[96vw] md:max-w-6xl xl:max-w-7xl overflow-hidden shadow-2xl relative flex flex-col max-h-[96vh]">
                
                {/* Modal Header Bar */}
                <div className="bg-slate-950 px-4 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-900">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-white flex items-center gap-2 text-xs md:text-sm">
                      <FaCheckCircle className="text-emerald-500 text-base" /> 
                      {quotationReceiptData 
                        ? "Dual Bills Generated (Tax Invoice & Quotation)" 
                        : (receiptData.isQuotation ? "Quotation / Estimate Generated" : "Tax Invoice Generated")
                      }
                    </h3>

                    {/* View Mode Switcher Tab (Summary vs PDF) */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setModalPreviewMode("summary")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          modalPreviewMode === "summary"
                            ? "bg-orange-500 text-slate-950 shadow-md font-black"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        📱 Interactive Bill Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalPreviewMode("pdf")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          modalPreviewMode === "pdf"
                            ? "bg-orange-500 text-slate-950 shadow-md font-black"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        📄 PDF Document View
                      </button>
                    </div>

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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditBillInPOS(currentActiveReceipt)}
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      title="Unlock and edit bill items, quantities or pricing in POS cart"
                    >
                      <FaEdit size={13} /> Edit Bill
                    </button>
                    <button 
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setReceiptData(null);
                        setQuotationReceiptData(null);
                      }}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      <FaTimes size={18} />
                    </button>
                  </div>
                </div>

                {/* MODAL CONTENT: Summary View vs PDF View */}
                {modalPreviewMode === "summary" ? (
                  <div className="flex-1 bg-slate-950 p-4 md:p-6 overflow-y-auto space-y-4 max-h-[75vh]">
                    {/* Success Header Box */}
                    <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold shrink-0">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white">
                            {currentActiveReceipt.isQuotation ? "Quotation / Estimate Generated!" : "Tax Invoice Generated Successfully!"}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Merchant: <strong className="text-slate-200">{shopName}</strong> | GSTIN: <strong className="text-orange-400 font-mono">{gstNumber}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Bill Number</span>
                        <span className="text-sm font-mono font-black text-orange-400">{currentActiveReceipt.id}</span>
                      </div>
                    </div>

                    {/* Customer & Bill Details Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-3 text-xs gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer Details</span>
                          <span className="font-bold text-white text-sm">{currentActiveReceipt.customerName}</span>
                          {currentActiveReceipt.customerPhone && currentActiveReceipt.customerPhone !== "N/A" && (
                            <span className="text-slate-400 text-xs font-mono block">📞 {currentActiveReceipt.customerPhone}</span>
                          )}
                          {currentActiveReceipt.customerGstNumber && (
                            <span className="text-orange-400 text-xs font-mono block font-bold">GSTIN: {currentActiveReceipt.customerGstNumber}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Payment Method</span>
                          <span className="px-3 py-1 rounded-lg text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 inline-block mt-0.5">
                            {currentActiveReceipt.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Line Items List */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Billed Items ({currentActiveReceipt.items.length})</span>
                        <div className="divide-y divide-slate-800/80 bg-slate-950 rounded-xl border border-slate-850 p-3 space-y-2.5">
                          {currentActiveReceipt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs pt-1.5">
                              <div className="flex-1 pr-2">
                                <p className="font-bold text-slate-100">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">₹{item.price.toFixed(2)} × {item.qty} {item.gstRate > 0 ? `(${item.gstRate}% GST)` : ""}</p>
                              </div>
                              <p className="font-mono font-bold text-white text-sm">₹{(item.price * item.qty).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Calculations Summary */}
                      <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Items Subtotal:</span>
                          <span className="font-mono font-bold text-slate-200">₹{(currentActiveReceipt.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {currentActiveReceipt.discountAmount > 0 && (
                          <div className="flex justify-between text-orange-400">
                            <span>Discount Applied ({currentActiveReceipt.discountPercent}%):</span>
                            <span className="font-mono font-bold">-₹{currentActiveReceipt.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {currentActiveReceipt.gstAmount > 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>GST Tax Collection:</span>
                            <span className="font-mono font-bold text-slate-200">₹{currentActiveReceipt.gstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                          <span className="font-extrabold text-white">Grand Total Billed:</span>
                          <span className="font-mono font-black text-xl text-emerald-400">₹{(currentActiveReceipt.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct WhatsApp Share Button */}
                    {currentActiveReceipt.customerPhone && currentActiveReceipt.customerPhone !== "N/A" && (
                      <a
                        href={`https://wa.me/91${currentActiveReceipt.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `*${(user?.profile?.shopName || user?.businessName || "Smart Ledger").toUpperCase()} - ${currentActiveReceipt.isQuotation ? "ESTIMATE / QUOTATION" : "TAX INVOICE"}*\n` +
                          `Bill No: *${currentActiveReceipt.id}*\n` +
                          `Date: ${new Date(currentActiveReceipt.date).toLocaleDateString()}\n` +
                          `Customer: ${currentActiveReceipt.customerName}\n` +
                          `----------------------------\n` +
                          currentActiveReceipt.items.map(it => `• ${it.name} x${it.qty} = ₹${(it.price * it.qty).toFixed(2)}`).join('\n') +
                          `\n----------------------------\n` +
                          `*Total Amount: ₹${(currentActiveReceipt.total || 0).toFixed(2)}*\n` +
                          `Payment Mode: ${currentActiveReceipt.paymentMethod}\n\n` +
                          `Thank you for doing business with ${user?.profile?.shopName || user?.businessName || "Smart Ledger"}! 🙏`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg text-xs transition"
                      >
                        <span className="text-base">💬</span>
                        <span>Send Invoice Summary on WhatsApp ({currentActiveReceipt.customerPhone})</span>
                      </a>
                    )}
                  </div>
                ) : (
                  /* Full Page Live PDF Preview */
                  <div className="flex-1 bg-slate-950 flex flex-col h-[75vh] w-full overflow-hidden">
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
                )}

                {/* Bottom Action Footer */}
                <div className="bg-slate-950 px-4 md:px-6 py-4 flex flex-col gap-2 border-t border-slate-900">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
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
                      className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-blue-400 text-xs shadow-md shadow-blue-900/40 transition active:scale-95"
                    >
                      <FaPrint /> Print {currentActiveReceipt.isQuotation ? "Quotation" : "Tax Invoice"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPosPdf(currentActiveReceipt)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-indigo-400 text-xs shadow-md shadow-indigo-900/40 transition active:scale-95"
                    >
                      <FaDownload /> Download {currentActiveReceipt?.isQuotation ? "Quotation PDF" : "Tax Invoice PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditBillInPOS(currentActiveReceipt)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 border border-amber-300 text-xs shadow-md shadow-amber-900/40 transition active:scale-95"
                    >
                      <FaEdit className="text-slate-950" /> Edit Bill / Modify Items
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setReceiptData(null);
                        setQuotationReceiptData(null);
                        setCustomInvoiceDate(new Date().toISOString().split("T")[0]);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 text-xs transition shadow-lg"
                    >
                      Next Customer ➔
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
                  placeholder="e.g. John Doe"
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-orange-500 bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Phone Number *</label>
                <input 
                  type="text" required
                  placeholder="e.g. 9000000000"
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
                    <div className="overflow-x-auto">
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

      {/* GOVERNMENT FUND UTILIZATION VOUCHER MODAL */}
      {showGovVoucherModal && govVoucherData && (
        <GovFundVoucherModal
          voucher={govVoucherData}
          onClose={() => setShowGovVoucherModal(false)}
          merchantInfo={user?.profile || { firmName: user?.businessName || "Smart Ledger", mobileNumber: user?.mobileNumber || "" }}
        />
      )}

    </div>
  );
}

export default POS;
