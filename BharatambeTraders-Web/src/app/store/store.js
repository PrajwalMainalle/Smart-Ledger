import { configureStore } from "@reduxjs/toolkit";
import inventoryReducer from "../../features/inventory/inventorySlice";
import billingReducer from "../../features/billing/billingSlice";
import authReducer from "../../features/auth/authSlice";
import customerReducer from "../../features/customers/customerSlice";
import requestsReducer from "../../features/requests/requestsSlice";
import govFundsReducer from "../../features/gov-funds/govFundSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    billing: billingReducer,
    customers: customerReducer,
    requests: requestsReducer,
    govFunds: govFundsReducer,
  },
});


