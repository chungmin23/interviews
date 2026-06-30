"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastType = "info" | "error" | "success";
type Toast = { id: number; msg: string; type: ToastType };
type ConfirmReq = { msg: string; resolve: (v: boolean) => void } | null;

type UICtx = {
  toast: (msg: string, type?: ToastType) => void;
  confirm: (msg: string) => Promise<boolean>;
};

const Ctx = createContext<UICtx | null>(null);

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be used within UIProvider");
  return c;
}

const toastTone: Record<ToastType, string> = {
  info: "bg-gray-900 text-white",
  error: "bg-red-600 text-white",
  success: "bg-accent text-white",
};

export default function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<ConfirmReq>(null);
  const idRef = useRef(0);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const confirm = useCallback(
    (msg: string) => new Promise<boolean>((resolve) => setConfirmReq({ msg, resolve })),
    []
  );

  function close(v: boolean) {
    confirmReq?.resolve(v);
    setConfirmReq(null);
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      {/* 토스트 */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2 text-sm shadow-lg ${toastTone[t.type]}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* 확인 모달 */}
      {confirmReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-800 whitespace-pre-line">{confirmReq.msg}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => close(false)}>취소</button>
              <button className="btn btn-sm btn-primary" autoFocus onClick={() => close(true)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
