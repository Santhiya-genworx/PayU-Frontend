import { useEffect, useState } from "react";
import "./toast.css"

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

function Toast({ message, type = "info", duration = 2500, onClose,}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true); 

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast ${isVisible ? "show" : ""} ${type}`}>
      {message}
      <div className={`progress ${isVisible ? "animate" : ""}`} style={{ transition: `transform ${duration}ms linear` }} />
    </div>
  );
}

export default Toast;