import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button, Modal } from './ui';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setDialog({
      title: 'Are you sure?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      tone: 'danger',
      ...options
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(dialog)} onClose={() => close(false)} size="sm">
        {dialog && (
          <div className="flex gap-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${dialog.tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'}`}>
              <ExclamationTriangleIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900">{dialog.title}</h3>
              {dialog.message && <p className="mt-1 text-sm text-slate-600">{dialog.message}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => close(false)}>
                  {dialog.cancelText}
                </Button>
                <Button variant={dialog.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                  {dialog.confirmText}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}
