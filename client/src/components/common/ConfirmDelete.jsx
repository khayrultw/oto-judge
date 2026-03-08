import React, { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

/**
 * Reusable confirm delete dialog using Radix UI AlertDialog
 * Per decision 6/a: short and standard copy
 * Per decision 7/a: keeps dialog open with loading state during async delete
 */
export const ConfirmDelete = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  entity = 'item',
  title,
  description 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by the caller via toast
      console.error('Delete action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 mb-2">
            {title || `Delete ${entity}?`}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-gray-600 mb-6">
            {description || 'This action cannot be undone.'}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Delete
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

/**
 * Hook to manage confirm delete dialog state
 * Usage:
 *   const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
 *   // In JSX: <ConfirmDeleteDialog />
 *   // In handler: const ok = await confirmDelete({ entity: 'contest', onConfirm: async () => { ... } });
 */
export const useConfirmDelete = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});
  const [resolver, setResolver] = useState(null);

  const confirmDelete = ({ entity, title, description, onConfirm }) => {
    return new Promise((resolve) => {
      setConfig({ entity, title, description, onConfirm });
      setResolver(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = async () => {
    try {
      await config.onConfirm();
      setIsOpen(false);
      if (resolver) resolver(true);
    } catch (error) {
      setIsOpen(false);
      if (resolver) resolver(false);
      throw error;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  const ConfirmDeleteDialog = () => (
    <ConfirmDelete
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      onConfirm={handleConfirm}
      entity={config.entity}
      title={config.title}
      description={config.description}
    />
  );

  return { confirmDelete, ConfirmDeleteDialog };
};
