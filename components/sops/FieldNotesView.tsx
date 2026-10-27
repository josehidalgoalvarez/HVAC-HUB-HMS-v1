import React, { useState } from 'react';
import { FIELD_NOTES } from '../../field_notes_constants';

interface FieldNotesViewProps {
  onBack?: () => void;
}

// Read-only reference. Notes come from the library doc; nothing here is a runnable SOP.
export const FieldNotesView: React.FC<FieldNotesViewProps> = ({ onBack }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 pb-28">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">sticky_note_2</span>
              Field notes
            </h1>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              Common problems from past work orders. Reference only.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
          {FIELD_NOTES.length} note{FIELD_NOTES.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {FIELD_NOTES.map((note) => {
          const open = expandedId === note.id;
          return (
            <div
              key={note.id}
              className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpandedId(open ? null : note.id)}
                className="w-full min-h-[44px] text-left p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-brand-black dark:text-white">{note.title}</h2>
                    {note.todo_verify ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">pending</span>
                        TODO-verify
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{note.applies_to}</p>
                </div>
                <span className="material-symbols-outlined text-gray-400 shrink-0" aria-hidden="true">
                  {open ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Symptoms</h3>
                    <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-200 list-disc pl-5">
                      {note.symptoms.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Checks, in order</h3>
                    <ol className="space-y-1.5 text-xs text-gray-700 dark:text-gray-200 list-decimal pl-5">
                      {note.checks.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">WO citations</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {note.wo_citations.map((w) => (
                        <span key={w} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-mono">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  {note.source_note && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{note.source_note}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldNotesView;
