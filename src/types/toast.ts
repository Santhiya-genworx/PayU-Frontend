import type { ToastType } from "../components/common/toast";

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}