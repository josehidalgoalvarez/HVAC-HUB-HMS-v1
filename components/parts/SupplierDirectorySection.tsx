import React from 'react';
import type { SupplierRecord } from '../../types/domain';

interface SupplierDirectorySectionProps {
  suppliers: SupplierRecord[];
}

export const SupplierDirectorySection: React.FC<SupplierDirectorySectionProps> = ({ suppliers }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-brand-black dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            Suppliers
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Phone numbers and desk hours
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
          {suppliers.length} Suppliers
        </span>
      </div>

      <div className="grid gap-3">
        {suppliers.map(supplier => {
          const rawPhone = supplier.phone ? supplier.phone.replace(/[^0-9+]/g, '') : '';
          return (
            <div
              key={supplier.id}
              className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-brand-black dark:text-white flex items-center gap-1.5">
                    {supplier.name}
                  </h3>
                  {supplier.contact_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Attn: {supplier.contact_name}
                    </p>
                  )}
                </div>

                {supplier.account_number && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 rounded-md">
                    Acct: {supplier.account_number}
                  </span>
                )}
              </div>

              {/* Hours and Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-800/60 p-2 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <div>
                    <span className="font-semibold block text-[10px] uppercase tracking-wider text-gray-400">Hours</span>
                    <span>{supplier.hours || 'Mon–Fri 8:30–5'}</span>
                  </div>
                </div>

                {supplier.address && (
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-800/60 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                    <div>
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-gray-400">Location</span>
                      <span className="truncate block">{supplier.address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Dialer Action Button */}
              {supplier.phone && (
                <div className="pt-1">
                  <a
                    href={`tel:${rawPhone}`}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-bold text-xs flex items-center justify-center gap-2 border border-primary/20 active:scale-[0.99] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    <span>Call {supplier.phone}</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
