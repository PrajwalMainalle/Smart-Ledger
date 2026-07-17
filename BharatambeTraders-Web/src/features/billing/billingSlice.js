import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchInvoices = createAsyncThunk(
  "billing/fetchInvoices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/billing");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load invoices log"
      );
    }
  }
);

export const checkout = createAsyncThunk(
  "billing/checkout",
  async (checkoutData, { getState, rejectWithValue }) => {
    try {
      const state = getState().billing;
      
      const payload = {
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerType: state.customerType,
        items: state.cart,
        discountPercent: state.discount,
        paymentMethod: state.paymentMethod,
        ...checkoutData,
      };

      const response = await axiosInstance.post("/billing", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Checkout failed"
      );
    }
  }
);

export const updateInvoice = createAsyncThunk(
  "billing/updateInvoice",
  async ({ invoiceId, checkoutData }, { getState, rejectWithValue }) => {
    try {
      const state = getState().billing;
      
      const payload = {
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerType: state.customerType,
        items: state.cart,
        discountPercent: state.discount,
        paymentMethod: state.paymentMethod,
        ...checkoutData,
      };

      const response = await axiosInstance.put(`/billing/${invoiceId}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Invoice update failed"
      );
    }
  }
);

export const refundInvoice = createAsyncThunk(
  "billing/refundInvoice",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const id = invoiceId._id || invoiceId;
      const response = await axiosInstance.put(`/billing/${id}/refund`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to process refund"
      );
    }
  }
);

export const convertQuotation = createAsyncThunk(
  "billing/convertQuotation",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const id = invoiceId._id || invoiceId;
      const response = await axiosInstance.put(`/billing/${id}/convert-quotation`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to convert quotation"
      );
    }
  }
);

export const settleInvoice = createAsyncThunk(
  "billing/settleInvoice",
  async ({ invoiceId, settlementMethod, settlementDate, amount }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/billing/${invoiceId}/settle`, {
        settlementMethod,
        settlementDate,
        amount
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to settle credit invoice"
      );
    }
  }
);

export const updateInvoicePaymentMethod = createAsyncThunk(
  "billing/updatePaymentMethod",
  async ({ invoiceId, paymentMethod, cashAmount, upiAmount, amountPaid }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/billing/${invoiceId}/payment-method`, {
        paymentMethod,
        cashAmount,
        upiAmount,
        amountPaid
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update payment method"
      );
    }
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState: {
    cart: [],
    customerName: "",
    customerPhone: "",
    customerType: "Retail",
    priceCategory: "retail",
    discount: 0, // Percent
    paymentMethod: "Cash",
    invoices: [],
    loading: false,
    error: null,
  },
  reducers: {
    addToCart: (state, action) => {
      // payload: product object
      const product = action.payload;
      const existingItem = state.cart.find(item => (item.id === product.id || item.productId === product.id));
      const category = state.priceCategory ? state.priceCategory.toLowerCase() : "retail";
      
      // Get appropriate price from map or fall back
      const pricesObj = product.prices || {};
      const selectedPrice = pricesObj[category] !== undefined 
        ? pricesObj[category] 
        : (pricesObj["retail"] !== undefined ? pricesObj["retail"] : product.price);

      if (existingItem) {
        if (existingItem.qty < product.stock) {
          existingItem.qty += 1;
        }
      } else {
        if (product.stock > 0) {
          state.cart.push({
            id: product.id || product._id,
            productId: product._id || product.id,
            name: product.name,
            originalPrice: product.price,
            prices: pricesObj, // Keep original pricing tiers reference
            price: selectedPrice,
            priceCategoryUsed: category,
            gstRate: product.gstRate,
            sku: product.sku,
            qty: 1,
            maxStock: product.stock
          });
        }
      }
    },
    addManualItem: (state, action) => {
      // payload: { name, price, qty, gstRate }
      const { name, price, qty, gstRate } = action.payload;
      const tempId = `manual_${Date.now()}`;
      state.cart.push({
        id: tempId,
        productId: null,
        name: name,
        originalPrice: parseFloat(price) || 0,
        prices: { retail: parseFloat(price) || 0 },
        price: parseFloat(price) || 0,
        priceCategoryUsed: "manual",
        gstRate: parseInt(gstRate, 10) || 0,
        sku: "MANUAL",
        qty: parseInt(qty, 10) || 1,
        maxStock: 999999,
        isManualItem: true,
      });
    },
    removeFromCart: (state, action) => {
      // payload: product id
      state.cart = state.cart.filter(item => (item.id !== action.payload && item.productId !== action.payload));
    },
    updateCartQty: (state, action) => {
      // payload: { id, qty }
      const { id, qty } = action.payload;
      const existingItem = state.cart.find(item => (item.id === id || item.productId === id));
      if (existingItem) {
        if (qty <= 0) {
          state.cart = state.cart.filter(item => (item.id !== id && item.productId !== id));
        } else {
          existingItem.qty = qty;
        }
      }
    },
    updateCartItemPrice: (state, action) => {
      // payload: { id, price }
      const { id, price } = action.payload;
      const existingItem = state.cart.find(item => (item.id === id || item.productId === id));
      if (existingItem) {
        existingItem.price = parseFloat(price) || 0;
        existingItem.priceCategoryUsed = "manual";
      }
    },
    setCustomerInfo: (state, action) => {
      // payload: { name, phone, customerType, priceCategory }
      state.customerName = action.payload.name || "";
      state.customerPhone = action.payload.phone || "";
      state.customerType = action.payload.customerType || "Retail";
      state.priceCategory = action.payload.priceCategory || "retail";

      // Recalculate price levels for existing items in cart (skip manually overridden ones)
      state.cart.forEach(item => {
        if (item.priceCategoryUsed !== "manual" && item.prices) {
          const category = state.priceCategory.toLowerCase();
          const pricesObj = item.prices || {};
          const selectedPrice = pricesObj[category] !== undefined 
            ? pricesObj[category] 
            : (pricesObj["retail"] !== undefined ? pricesObj["retail"] : item.originalPrice);
          item.price = selectedPrice;
          item.priceCategoryUsed = category;
        }
      });
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setDiscount: (state, action) => {
      // payload: discount percentage
      state.discount = action.payload;
    },
    clearCart: (state) => {
      state.cart = [];
      state.customerName = "";
      state.customerPhone = "";
      state.customerType = "Retail";
      state.priceCategory = "retail";
      state.discount = 0;
      state.paymentMethod = "Cash";
    },
    restoreCartAndBillingState: (state, action) => {
      const { cart, customerName, customerPhone, customerType, priceCategory, discount, paymentMethod } = action.payload;
      state.cart = cart || [];
      state.customerName = customerName || "";
      state.customerPhone = customerPhone || "";
      state.customerType = customerType || "Retail";
      state.priceCategory = priceCategory || "retail";
      state.discount = discount || 0;
      state.paymentMethod = paymentMethod || "Cash";
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        // Map _id to id for backward compatibility
        state.invoices = action.payload.map(inv => ({
          ...inv,
          id: inv.invoiceId, // UI relies on inv.id to show the code e.g. INV-2026-0001
        }));
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Checkout Invoice
      .addCase(checkout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkout.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices.unshift({
          ...action.payload,
          id: action.payload.invoiceId,
        });
        // Clear cart values after checkout success
        state.cart = [];
        state.customerName = "";
        state.customerPhone = "";
        state.discount = 0;
        state.paymentMethod = "Cash";
      })
      .addCase(checkout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Invoice
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(
          inv => (inv._id === action.payload._id || inv.id === action.payload.invoiceId)
        );
        if (index !== -1) {
          state.invoices[index] = {
            ...action.payload,
            id: action.payload.invoiceId,
          };
        }
        // Clear cart values after checkout success
        state.cart = [];
        state.customerName = "";
        state.customerPhone = "";
        state.discount = 0;
        state.paymentMethod = "Cash";
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Refund Invoice
      .addCase(refundInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refundInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(
          inv => (inv._id === action.payload._id || inv.id === action.payload.invoiceId)
        );
        if (index !== -1) {
          state.invoices[index] = {
            ...action.payload,
            id: action.payload.invoiceId,
          };
        }
      })
      .addCase(refundInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Convert Quotation
      .addCase(convertQuotation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertQuotation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(
          inv => (inv._id === action.payload._id || inv.id === action.payload.invoiceId)
        );
        if (index !== -1) {
          state.invoices[index] = {
            ...action.payload,
            id: action.payload.invoiceId,
          };
        }
      })
      .addCase(convertQuotation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Payment Method
      .addCase(updateInvoicePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoicePaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(
          inv => (inv._id === action.payload._id || inv.id === action.payload.invoiceId)
        );
        if (index !== -1) {
          state.invoices[index] = {
            ...action.payload,
            id: action.payload.invoiceId,
          };
        }
      })
      .addCase(updateInvoicePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Settle Credit Invoice
      .addCase(settleInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(settleInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(
          inv => (inv._id === action.payload._id || inv.id === action.payload.invoiceId)
        );
        if (index !== -1) {
          state.invoices[index] = {
            ...action.payload,
            id: action.payload.invoiceId,
          };
        }
      })
      .addCase(settleInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  addToCart,
  removeFromCart,
  updateCartQty,
  updateCartItemPrice,
  addManualItem,
  setCustomerInfo,
  setPaymentMethod,
  setDiscount,
  clearCart,
  restoreCartAndBillingState
} = billingSlice.actions;

export default billingSlice.reducer;
