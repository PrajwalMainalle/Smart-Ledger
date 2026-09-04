import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/customers");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load customers"
      );
    }
  }
);

export const addCustomer = createAsyncThunk(
  "customers/addCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/customers", customerData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add customer"
      );
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const { id, ...data } = customerData;
      const custId = customerData._id || customerData.id;
      const response = await axiosInstance.put(`/customers/${custId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update customer"
      );
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/deleteCustomer",
  async (customerId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/customers/${customerId}`);
      return customerId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete customer"
      );
    }
  }
);

export const fetchCustomerLedger = createAsyncThunk(
  "customers/fetchCustomerLedger",
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/customers/${customerId}/ledger`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load customer ledger"
      );
    }
  }
);

export const collectPayment = createAsyncThunk(
  "customers/collectPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/billing/collection", paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to record payment collection"
      );
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState: {
    customers: [],
    loading: false,
    error: null,
    activeLedger: null,
    ledgerLoading: false,
  },
  reducers: {
    clearActiveLedger: (state) => {
      state.activeLedger = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Customers
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        const list = Array.isArray(action.payload) ? action.payload : [];
        state.customers = list.map(c => ({
          ...c,
          id: c._id,
        }));
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Customer
      .addCase(addCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers.unshift({
          ...action.payload,
          id: action.payload._id,
        });
      })
      .addCase(addCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Customer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customers.findIndex(
          c => (c._id === action.payload._id || c.id === action.payload._id)
        );
        if (index !== -1) {
          state.customers[index] = {
            ...action.payload,
            id: action.payload._id,
          };
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Customer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = state.customers.filter(
          c => (c._id !== action.payload && c.id !== action.payload)
        );
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Customer Ledger
      .addCase(fetchCustomerLedger.pending, (state) => {
        state.ledgerLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.activeLedger = action.payload;
      })
      .addCase(fetchCustomerLedger.rejected, (state, action) => {
        state.ledgerLoading = false;
        state.error = action.payload;
      })
      // Collect Payment
      .addCase(collectPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(collectPayment.fulfilled, (state, action) => {
        state.loading = false;
        const collectedPhone = action.meta.arg.customerPhone;
        const index = state.customers.findIndex(c => c.phone === collectedPhone);
        if (index !== -1) {
          state.customers[index].outstandingBalance = action.payload.updatedBalance;
        }
        if (state.activeLedger && state.activeLedger.customer.phone === collectedPhone) {
          state.activeLedger.customer.outstandingBalance = action.payload.updatedBalance;
          state.activeLedger.ledger.push(action.payload.ledgerEntry);
        }
      })
      .addCase(collectPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearActiveLedger } = customerSlice.actions;

export default customerSlice.reducer;
