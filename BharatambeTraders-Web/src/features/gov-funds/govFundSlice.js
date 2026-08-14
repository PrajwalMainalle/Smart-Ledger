import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchGovDashboard = createAsyncThunk(
  "govFunds/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/gov-funds/dashboard-stats");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load dashboard data");
    }
  }
);

export const fetchGovSchools = createAsyncThunk(
  "govFunds/fetchSchools",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/gov-funds/schools");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load schools");
    }
  }
);

export const createGovSchool = createAsyncThunk(
  "govFunds/createSchool",
  async (schoolData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/gov-funds/schools", schoolData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create school");
    }
  }
);

export const updateGovSchool = createAsyncThunk(
  "govFunds/updateSchool",
  async ({ id, schoolData }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/gov-funds/schools/${id}`, schoolData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update school");
    }
  }
);

export const deleteGovSchool = createAsyncThunk(
  "govFunds/deleteSchool",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/gov-funds/schools/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete school");
    }
  }
);

export const fetchGovGrants = createAsyncThunk(
  "govFunds/fetchGrants",
  async (queryParams = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const res = await axiosInstance.get(`/gov-funds/funds?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load funds");
    }
  }
);

export const createGovGrant = createAsyncThunk(
  "govFunds/createGrant",
  async (grantData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/gov-funds/funds", grantData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create fund account");
    }
  }
);

export const activateGovGrant = createAsyncThunk(
  "govFunds/activateGrant",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/gov-funds/funds/${id}/activate`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to activate fund account");
    }
  }
);

export const fetchGovTransactions = createAsyncThunk(
  "govFunds/fetchTransactions",
  async (fundId = "all", { rejectWithValue }) => {
    try {
      const url = fundId && fundId !== "all" ? `/gov-funds/ledger/${fundId}` : "/gov-funds/ledger";
      const res = await axiosInstance.get(url);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load ledger transactions");
    }
  }
);

export const reverseGovLedger = createAsyncThunk(
  "govFunds/reverseLedger",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/gov-funds/ledger/${id}/reverse`, { reason });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reverse transaction");
    }
  }
);

export const adjustGovFund = createAsyncThunk(
  "govFunds/adjustFund",
  async ({ fundId, adjustmentData }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/gov-funds/funds/${fundId}/adjust`, adjustmentData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to adjust fund balance");
    }
  }
);

const govFundSlice = createSlice({
  name: "govFunds",
  initialState: {
    dashboard: null,
    schools: [],
    grants: [],
    transactions: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGovError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
      .addCase(fetchGovDashboard.pending, (state) => { state.loading = true; })
      .addCase(fetchGovDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchGovDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Schools
      .addCase(fetchGovSchools.fulfilled, (state, action) => { state.schools = action.payload; })
      .addCase(createGovSchool.fulfilled, (state, action) => { state.schools.unshift(action.payload); })
      .addCase(updateGovSchool.fulfilled, (state, action) => {
        const index = state.schools.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) state.schools[index] = action.payload;
      })
      .addCase(deleteGovSchool.fulfilled, (state, action) => {
        state.schools = state.schools.filter((s) => s._id !== action.payload);
      })
      // Grants (Funds)
      .addCase(fetchGovGrants.fulfilled, (state, action) => { state.grants = action.payload; })
      .addCase(createGovGrant.fulfilled, (state, action) => { state.grants.unshift(action.payload); })
      // Transactions (Ledgers)
      .addCase(fetchGovTransactions.fulfilled, (state, action) => { state.transactions = action.payload; });
  },
});

export const { clearGovError } = govFundSlice.actions;
export default govFundSlice.reducer;
