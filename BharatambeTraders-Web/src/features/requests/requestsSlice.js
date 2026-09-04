import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/api/axiosInstance";

// Async Thunks
export const fetchRequests = createAsyncThunk(
  "requests/fetchRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/requests");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load customer requests"
      );
    }
  }
);

export const addRequest = createAsyncThunk(
  "requests/addRequest",
  async (requestData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/requests", requestData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add customer request"
      );
    }
  }
);

export const updateRequest = createAsyncThunk(
  "requests/updateRequest",
  async (requestData, { rejectWithValue }) => {
    try {
      const { id, ...data } = requestData;
      const reqId = requestData._id || id;
      const response = await axiosInstance.put(`/requests/${reqId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update customer request"
      );
    }
  }
);

export const deleteRequest = createAsyncThunk(
  "requests/deleteRequest",
  async (requestId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/requests/${requestId}`);
      return requestId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete customer request"
      );
    }
  }
);

export const fetchReminderStats = createAsyncThunk(
  "requests/fetchReminderStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/requests/reminders");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load reminder statistics"
      );
    }
  }
);

const requestsSlice = createSlice({
  name: "requests",
  initialState: {
    requests: [],
    reminderStats: {
      pendingRequests: 0,
      readyRequests: 0,
      outOfStockProducts: 0,
    },
    loading: false,
    statsLoading: false,
    error: null,
  },
  reducers: {
    clearRequestsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Requests
      .addCase(fetchRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.loading = false;
        const list = Array.isArray(action.payload) ? action.payload : [];
        state.requests = list.map(r => ({
          ...r,
          id: r._id,
        }));
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Request
      .addCase(addRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.requests.unshift({
          ...action.payload,
          id: action.payload._id,
        });
      })
      .addCase(addRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Request
      .addCase(updateRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRequest.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.requests.findIndex(
          r => (r._id === action.payload._id || r.id === action.payload._id)
        );
        if (index !== -1) {
          state.requests[index] = {
            ...action.payload,
            id: action.payload._id,
          };
        }
      })
      .addCase(updateRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Request
      .addCase(deleteRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = state.requests.filter(
          r => (r._id !== action.payload && r.id !== action.payload)
        );
      })
      .addCase(deleteRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Reminder Stats
      .addCase(fetchReminderStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchReminderStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.reminderStats = action.payload;
      })
      .addCase(fetchReminderStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearRequestsError } = requestsSlice.actions;
export default requestsSlice.reducer;
