import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Load initial state safely from local storage
const storedUser = localStorage.getItem("bt_user");
const storedToken = localStorage.getItem("bt_token");

let parsedUser = null;
if (storedUser) {
  try {
    parsedUser = JSON.parse(storedUser);
  } catch (err) {
    console.error("Failed to parse stored user from localStorage:", err);
    localStorage.removeItem("bt_user");
  }
}

const initialState = {
  user: parsedUser,
  token: storedToken || null,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
};

// Async Thunks
export const registerTenant = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/auth/register", userData);
      const data = response.data;
      
      localStorage.setItem("bt_token", data.token);
      localStorage.setItem("bt_user", JSON.stringify(data));
      
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

export const loginTenant = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/auth/login", credentials);
      const data = response.data;
      
      localStorage.setItem("bt_token", data.token);
      localStorage.setItem("bt_user", JSON.stringify(data));
      
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Invalid credentials"
      );
    }
  }
);

export const getProfile = createAsyncThunk(
  "auth/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/auth/profile");
      const data = response.data;
      
      // Update local storage user profile data
      const token = localStorage.getItem("bt_token");
      const updatedUser = { ...data, token };
      localStorage.setItem("bt_user", JSON.stringify(updatedUser));
      
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profile"
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/auth/profile", profileData);
      const data = response.data;
      
      const token = localStorage.getItem("bt_token");
      const updatedUser = { ...data, token };
      localStorage.setItem("bt_user", JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("bt_token");
      localStorage.removeItem("bt_user");
      // Clear localStorage of POS cart/invoices to force clean tenant transition
      localStorage.removeItem("bt_inventory");
      localStorage.removeItem("bt_invoices");
      
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(registerTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(loginTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Profile
      .addCase(getProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user = {
            ...state.user,
            ...action.payload,
            profile: action.payload.profile || {},
            gstBillingRule: action.payload.gstBillingRule || "warn",
            creditReminderDays: action.payload.creditReminderDays || 20,
          };
        } else {
          state.user = action.payload;
        }
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
