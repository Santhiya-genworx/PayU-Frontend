import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getProfile, login as loginService, logout as logoutService } from "../services/authService";
import type { User } from "../../../types/user";

// Typed rejectWithValue shape
interface RejectValue {
  message: string;
}

export const fetchUser = createAsyncThunk<User, void, { rejectValue: RejectValue }>(
  "auth/fetchUser",
  async (_, { rejectWithValue }) => {
    try {
      return await getProfile();
    } catch {
      return rejectWithValue({ message: "Fetching user failed" });
    }
  }
);

export const login = createAsyncThunk<
  User,                        // return type
  { email: string; password: string }, // payload type
  { rejectValue: RejectValue } // thunkAPI config
>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginService(credentials);
      return response.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return rejectWithValue({ message });
    }
  }
);

export const logout = createAsyncThunk<true, void, { rejectValue: RejectValue }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logoutService();
      return true;
    } catch {
      return rejectWithValue({ message: "Logout failed" });
    }
  }
);

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload?.message ?? "Unknown error";
      })

      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload?.message ?? "Unknown error";
      })

      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload?.message ?? "Unknown error";
      });
  },
});

export const { setUser, clearAuthState } = authSlice.actions;
export default authSlice.reducer;