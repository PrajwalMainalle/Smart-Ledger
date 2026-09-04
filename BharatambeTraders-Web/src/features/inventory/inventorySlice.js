import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchProducts = createAsyncThunk(
  "inventory/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/inventory");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load inventory products"
      );
    }
  }
);

export const addProduct = createAsyncThunk(
  "inventory/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/inventory", productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add inventory product"
      );
    }
  }
);

export const updateProduct = createAsyncThunk(
  "inventory/updateProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const { id, ...data } = productData; // backend expects ID in params
      // Mongoose IDs are strings like _id, but frontend uses product.id or product._id.
      // We will handle mapping between product.id and product._id dynamically.
      const prodId = productData._id || productData.id;
      const response = await axiosInstance.put(`/inventory/${prodId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update inventory product"
      );
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "inventory/deleteProduct",
  async (productId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/inventory/${productId}`);
      return productId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete inventory product"
      );
    }
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState: {
    products: [],
    loading: false,
    error: null,
  },
  reducers: {
    // Keep local actions for backward-compatibility or local state manipulations if needed
    deductStock: (state, action) => {
      // payload: array of { id, qty }
      action.payload.forEach(({ id, qty }) => {
        const prodId = id;
        const product = state.products.find(p => (p._id === prodId || p.id === prodId));
        if (product) {
          product.stock = Math.max(0, product.stock - qty);
        }
      });
    },
    restockProduct: (state, action) => {
      // payload: { id, qty }
      const prodId = action.payload.id;
      const product = state.products.find(p => (p._id === prodId || p.id === prodId));
      if (product) {
        product.stock += action.payload.qty;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        // Map backend _id to id to keep backward-compatibility with UI references
        const list = Array.isArray(action.payload) ? action.payload : [];
        state.products = list.map(p => ({
          ...p,
          id: p._id,
        }));
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Product
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.unshift({
          ...action.payload,
          id: action.payload._id,
        });
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex(
          p => (p._id === action.payload._id || p.id === action.payload._id)
        );
        if (index !== -1) {
          state.products[index] = {
            ...action.payload,
            id: action.payload._id,
          };
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(
          p => (p._id !== action.payload && p.id !== action.payload)
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { deductStock, restockProduct } = inventorySlice.actions;
export default inventorySlice.reducer;
