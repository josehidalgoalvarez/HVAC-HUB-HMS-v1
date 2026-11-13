import React from 'react';
import { TicketPart } from '../../../types/domain';
import { formatDate } from '../../../utils/dateUtils';

interface TicketPartsSectionProps {
  parts: TicketPart[];
  onOrderPart: () => void;
  onMarkArrived: (part: TicketPart) => void;
  onUndoArrived: (part: TicketPart) => void;
}

export const TicketPartsSection: React.FC<TicketPartsSectionProps> = ({
  parts,
  onOrderPart,
  onMarkArrived,
  onUndoArrived,
}) => {
  return (
    <>
      {/* Parts Needed & Ordered (Auto-Created Watches) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-amber-500 text-xl">shopping_cart</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Parts Needed & Ordered
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
              {parts.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOrderPart}
            className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-white rounded-xl shadow-xs hover:bg-amber-600 flex items-center gap-1"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
            Order Part
          </button>
        </div>

        {parts.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No parts ordered for this ticket. Tap "Order Part" to order for any appliance type.
          </div>
        ) : (
          <div className="space-y-2">
            {parts.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-card-dark rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-brand-black dark:text-white">
                      {p.part_name}
                    </span>
                    {p.part_number && (
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        #{p.part_number}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {p.appliance_type || 'Appliance'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-md uppercase tracking-wider ${
                        p.status === 'arrived'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>Supplier: <strong className="text-brand-black dark:text-white">{p.supplier}</strong></span>
                    {p.order_ref && <span>Ref: <strong className="font-mono text-brand-black dark:text-white">{p.order_ref}</strong></span>}
                    <span>Qty: <strong>{p.quantity}</strong></span>
                    {p.ordered_at && <span>Ordered: {formatDate(p.ordered_at)}</span>}
                    {p.watch_id && (
                      <span className="text-primary font-semibold flex items-center gap-0.5">
                        <span aria-hidden="true" className="material-symbols-outlined text-[13px]">visibility</span>
                        Watch #{p.watch_id} {p.status === 'arrived' ? '(Resolved)' : '(Active)'}
                      </span>
                    )}
                  </div>

                  {p.notes && <p className="text-xs text-gray-400 italic">Note: {p.notes}</p>}
                </div>

                {p.status === 'ordered' && (
                  <button
                    type="button"
                    onClick={() => onMarkArrived(p)}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1 shrink-0 transition-colors active:scale-95"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">inventory_2</span>
                    Mark Arrived
                  </button>
                )}

                {p.status === 'arrived' && (
                  <button
                    type="button"
                    onClick={() => onUndoArrived(p)}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-brand-red border border-gray-200 dark:border-gray-700 hover:border-red-300 rounded-xl transition-colors flex items-center justify-center gap-1 shrink-0 active:scale-95"
                    title="Undo marked as arrived (restore to ordered)"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">undo</span>
                    <span>Undo</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
};
