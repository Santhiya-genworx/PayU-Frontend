import { useLoading } from "../../context/loadingContext";

export const Spinner = () => {
  const { isLoading } = useLoading();
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className="w-12.5 h-12.5 rounded-full border-[6px] border-[#ccc] border-t-[#2538e0] animate-spin" />
    </div>
  );
};