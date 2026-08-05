import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchGovDashboard = createAsyncThunk(
  "govFunds/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/gov-funds/dashboard");
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

export const fetchGovTeachers = createAsyncThunk(
  "govFunds/fetchTeachers",
  async (schoolId, { rejectWithValue }) => {
    try {
      const url = schoolId ? `/gov-funds/teachers?schoolId=${schoolId}` : "/gov-funds/teachers";
      const res = await axiosInstance.get(url);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load teachers");
    }
  }
);

export const createGovTeacher = createAsyncThunk(
  "govFunds/createTeacher",
  async (teacherData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/gov-funds/teachers", teacherData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create teacher");
    }
  }
);

export const updateGovTeacher = createAsyncThunk(
  "govFunds/updateTeacher",
  async ({ id, teacherData }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/gov-funds/teachers/${id}`, teacherData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update teacher");
    }
  }
);

export const deleteGovTeacher = createAsyncThunk(
  "govFunds/deleteTeacher",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/gov-funds/teachers/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete teacher");
    }
  }
);

export const fetchGovGrants = createAsyncThunk(
  "govFunds/fetchGrants",
  async (queryParams = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const res = await axiosInstance.get(`/gov-funds/grants?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load grants");
    }
  }
);

export const createGovGrant = createAsyncThunk(
  "govFunds/createGrant",
  async (grantData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/gov-funds/grants", grantData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create grant");
    }
  }
);

export const closeGovGrant = createAsyncThunk(
  "govFunds/closeGrant",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/gov-funds/grants/${id}/settlement`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to close grant");
    }
  }
);

export const fetchGovCashPayments = createAsyncThunk(
  "govFunds/fetchCashPayments",
  async (queryParams = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const res = await axiosInstance.get(`/gov-funds/cash-payments?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load cash payments");
    }
  }
);

export const createGovCashPayment = createAsyncThunk(
  "govFunds/createCashPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/gov-funds/cash-payments", paymentData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to record cash payment");
    }
  }
);

export const fetchGovTransactions = createAsyncThunk(
  "govFunds/fetchTransactions",
  async (queryParams = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const res = await axiosInstance.get(`/gov-funds/transactions?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load transactions");
    }
  }
);

export const fetchGovMaterialUsage = createAsyncThunk(
  "govFunds/fetchMaterialUsage",
  async (queryParams = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const res = await axiosInstance.get(`/gov-funds/material-usage?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load material usage");
    }
  }
);

const govFundSlice = createSlice({
  name: "govFunds",
  initialState: {
    dashboard: null,
    schools: [],
    teachers: [],
    grants: [],
    cashPayments: [],
    transactions: [],
    materialUsage: [],
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
      // Teachers
      .addCase(fetchGovTeachers.fulfilled, (state, action) => { state.teachers = action.payload; })
      .addCase(createGovTeacher.fulfilled, (state, action) => { state.teachers.unshift(action.payload); })
      .addCase(updateGovTeacher.fulfilled, (state, action) => {
        const index = state.teachers.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.teachers[index] = action.payload;
      })
      .addCase(deleteGovTeacher.fulfilled, (state, action) => {
        state.teachers = state.teachers.filter((t) => t._id !== action.payload);
      })
      // Grants
      .addCase(fetchGovGrants.fulfilled, (state, action) => { state.grants = action.payload; })
      .addCase(createGovGrant.fulfilled, (state, action) => { state.grants.unshift(action.payload); })
      .addCase(closeGovGrant.fulfilled, (state, action) => {
        const index = state.grants.findIndex((g) => g._id === action.payload.grant._id);
        if (index !== -1) state.grants[index] = action.payload.grant;
      })
      // Cash Payments
      .addCase(fetchGovCashPayments.fulfilled, (state, action) => { state.cashPayments = action.payload; })
      .addCase(createGovCashPayment.fulfilled, (state, action) => { state.cashPayments.unshift(action.payload); })
      // Transactions
      .addCase(fetchGovTransactions.fulfilled, (state, action) => { state.transactions = action.payload; })
      // Material Usage
      .addCase(fetchGovMaterialUsage.fulfilled, (state, action) => { state.materialUsage = action.payload; });
  },
});

export const { clearGovError } = govFundSlice.actions;
export default govFundSlice.reducer;
