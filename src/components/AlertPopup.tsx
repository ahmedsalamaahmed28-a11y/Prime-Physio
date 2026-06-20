"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

interface AlertPopupProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertPopup({ message, isOpen, onClose }: AlertPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transition-all duration-200 ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
            <TriangleAlert className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-relaxed">
            {message}
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full py-2.5 rounded-xl bg-[#4F46BA] text-white text-sm font-semibold hover:bg-[#4338ca] transition-colors"
          >
            حسناً
          </button>
        </div>
      </div>
    </>
  );
}
