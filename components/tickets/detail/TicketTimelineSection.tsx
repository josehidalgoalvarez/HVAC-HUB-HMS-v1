import React from 'react';
import { TicketTimelineEvent } from '../../../types/domain';
import { formatDateTime } from '../../../utils/dateUtils';

interface TicketTimelineSectionProps {
  events: TicketTimelineEvent[];
}

export const TicketTimelineSection: React.FC<TicketTimelineSectionProps> = ({ events }) => {
  // Ticket Timeline (Append-Only Events)
  return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">timeline</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Ticket Timeline
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {events.length}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">Append-Only Provenance</span>
        </div>

        {events.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No events recorded yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs relative">
            <div className="absolute top-6 bottom-6 left-[27px] w-0.5 bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-5">
              {events.map((ev, idx) => {
                const getEventConfig = (type: string) => {
                  switch (type) {
                    case 'submitted':
                      return { icon: 'inbox', bg: 'bg-blue-500', label: 'Ticket Submitted' };
                    case 'visit_logged':
                      return { icon: 'door_front', bg: 'bg-amber-500', label: 'Visit Logged' };
                    case 'appliance_identified':
                      return { icon: 'photo_camera', bg: 'bg-indigo-600', label: 'Appliance Identified' };
                    case 'part_needed':
                      return { icon: 'build', bg: 'bg-orange-500', label: 'Part Needed' };
                    case 'part_ordered':
                      return { icon: 'shopping_cart', bg: 'bg-sky-500', label: 'Part Ordered' };
                    case 'part_arrived':
                      return { icon: 'inventory_2', bg: 'bg-emerald-500', label: 'Part Arrived' };
                    case 'return_visit':
                      return { icon: 'autorenew', bg: 'bg-purple-500', label: 'Return Visit' };
                    case 'completed':
                      return { icon: 'check_circle', bg: 'bg-emerald-600', label: 'Job Completed' };
                    case 'sop_run_completed':
                      return { icon: 'fact_check', bg: 'bg-teal-600', label: 'SOP Run Completed' };
                    case 'pruned_to_history':
                      return { icon: 'history_edu', bg: 'bg-rose-700', label: 'Pruned to Unit History (Archived)' };
                    default:
                      return { icon: 'event_note', bg: 'bg-gray-500', label: 'Note / Event' };
                  }
                };
                const cfg = getEventConfig(ev.event_type);
                const meta = ev.metadata || {};

                return (
                  <div key={ev.id || idx} className="relative flex items-start gap-3.5 pl-1">
                    <div
                      className={`w-7 h-7 rounded-full ${cfg.bg} text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-white dark:ring-card-dark z-10`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0 bg-gray-50/70 dark:bg-neutral-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-brand-black dark:text-white">
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-500">by {ev.actor}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-400">
                          {formatDateTime(ev.created_at)}
                        </span>
                      </div>

                      {ev.note && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {ev.note}
                        </p>
                      )}

                      {/* Event Metadata Chips / Indicators */}
                      {meta && Object.keys(meta).length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap text-xs">
                          {meta.sop_title && (
                            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold border border-teal-500/20">
                              {meta.sop_title}
                            </span>
                          )}
                          {meta.duration_minutes !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 font-mono">
                              {meta.duration_minutes} min{meta.duration_minutes === 1 ? '' : 's'}
                            </span>
                          )}
                          {meta.deviations_count > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                              {meta.deviations_count} deviation{meta.deviations_count === 1 ? '' : 's'}
                            </span>
                          )}
                          {meta.is_our_miss && (
                            <span className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800">
                              [OUR MISS] Notice Not Sent Prior
                            </span>
                          )}
                          {meta.outcome && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono text-xs">
                              outcome: {meta.outcome}
                            </span>
                          )}
                          {meta.failure_reason && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-mono text-xs">
                              reason: {meta.failure_reason}
                            </span>
                          )}
                          {meta.supplier && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 text-xs">
                              Supplier: {meta.supplier}
                            </span>
                          )}
                          {meta.order_ref && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                              Ref: {meta.order_ref}
                            </span>
                          )}
                          {meta.photo_url && (
                            <a
                              href={meta.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-xs font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[12px]">image</span>
                              Photo
                            </a>
                          )}
                          {meta.rating_plate_url && (
                            <a
                              href={meta.rating_plate_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-xs font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[12px]">badge</span>
                              Rating Plate
                            </a>
                          )}
                          {meta.manual_url && (
                            <a
                              href={meta.manual_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-xs font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[12px]">menu_book</span>
                              Manual Link
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
  );
};
