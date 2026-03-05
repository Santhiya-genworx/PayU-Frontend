import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/slices/authSlice"
import dashboardReducer from "../features/dashboard/slices/dashboardSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        extraction: dashboardReducer
    }
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;