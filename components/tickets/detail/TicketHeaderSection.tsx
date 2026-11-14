import React, { useState, useEffect } from 'react';
import { Ticket } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';
import { TicketStatusBadge, TicketPriorityBadge } from '../TicketStatusBadges';
import { formatDate, formatDateTime, formatTime } from '../../../utils/dateUtils';
import { ExplainableTerm } from '../../common/ExplainableTerm';
import { TicketNoticeCard } from './TicketNoticeCard';
import { UnitContextChip } from '../../../utils/unitContextUtils';

interface TicketHeaderSectionProps {
  ticket: Ticket;
  locationText: string;
  hasRepeatAccessProblem: boolean;
  unitContextChips: UnitContextChip[];
  onBack: () => void;
  onRunSop?: (sopId: string) => void;
  onTicketChange: (next: Ticket) => void;
  onEdit: () => void;
  onLogVisit: () => void;
  onOrderPart: () => void;
  onIdentify: () => void;
  onPruned: () => Promise<void> | void;
}

export const TicketHeaderSection: React.FC<TicketHeaderSectionProps> = ({
  ticket,
  locationText,
  hasRepeatAccessProblem,
  unitContextChips,
  onBack,
  onRunSop,
  onTicketChange,
  onEdit,
  onLogVisit,
  onOrderPart,
  onIdentify,
  onPruned,
}) => {
  const [workExposure, setWorkExposure] = useState<'indoor' | 'exterior' | 'exterior_ladder'>('indoor');
  const [rainExpected, setRainExpected] = useState<boolean | null>(null);
  const [savingExposure, setSavingExposure] = useState(false);
  const [exposureFeedback, setExposureFeedback] = useState<string | null>(null);

  const [sightingStamping, setSightingStamping] = useState(false);

  const [sightingSuccessMsg, setSightingSuccessMsg] = useState<string | null>(null);
  const [isPruning, setIsPruning] = useState(false);

  useEffect(() => {
    const exposure = (ticket.work_exposure || 'indoor') as 'indoor' | 'exterior' | 'exterior_ladder';
    setWorkExposure(exposure);
    if (exposure === 'exterior' || exposure === 'exterior_ladder') {
      const scheduledDate = ticket.scheduled_date || (ticket.scheduled_at ? ticket.scheduled_at.slice(0, 10) : undefined);
      apiClient.checkRainExpected(scheduledDate).then(setRainExpected).catch(() => setRainExpected(null));
    } else {
      setRainExpected(null);
    }
  }, [ticket.id, ticket.work_exposure, ticket.scheduled_date, ticket.scheduled_at]);

  const handleStampYardiSighting = async () => {
    if (!ticket) return;
    setSightingStamping(true);
    setSightingSuccessMsg(null);
    try {
      const res = await apiClient.recordYardiSighting(ticket.id, {
        wo_number: ticket.wo_number || 'UNKNOWN',
        description: ticket.title,
        status: 'Active in Yardi',
      });
      setSightingSuccessMsg(`Yardi sighting stamped at ${formatTime(res.sighted_at)}`);
      await onPruned();
      setTimeout(() => setSightingSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to stamp Yardi sighting');
    } finally {
      setSightingStamping(false);
    }
  };

  const handleManualPrune = async () => {
    if (!ticket) return;
    const woLabel = ticket.wo_number ? `WO #${ticket.wo_number}` : `Ticket #${ticket.id}`;
    const confirmed = window.confirm(
      `Prune "${ticket.title}" (${woLabel}) to unit history now and move to archive?\n\nThis will record a permanent history entry on the unit and remove the ticket from active lists.`
    );
    if (!confirmed) return;

    try {
      setIsPruning(true);
      const updated = await apiClient.pruneTicketToHistory(ticket.id, 'Jose (Tech)', 'Manual prune to unit history');
      onTicketChange(updated);
      await onPruned();
      alert('Ticket successfully pruned to unit history and archived.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to prune ticket');
    } finally {
      setIsPruning(false);
    }
  };


  const handleSetExposure = async (newExp: 'indoor' | 'exterior' | 'exterior_ladder') => {
    if (!ticket || newExp === workExposure) return;
    setSavingExposure(true);
    setExposureFeedback(null);
    try {
      const updated = await apiClient.updateTicket(ticket.id, {
        work_exposure: newExp,
        exterior_work: newExp !== 'indoor',
        reason: `Changed work exposure to ${newExp}`,
      });
      onTicketChange(updated);
      setWorkExposure(newExp);

      if (newExp === 'exterior' || newExp === 'exterior_ladder') {
        const scheduledDate = updated?.scheduled_date || (updated?.scheduled_at ? updated.scheduled_at.slice(0, 10) : undefined);
        const rain = await apiClient.checkRainExpected(scheduledDate);
        setRainExpected(rain);
      } else {
        setRainExpected(null);
      }

      const label = newExp === 'exterior_ladder' ? 'Exterior + Ladder' : newExp === 'exterior' ? 'Exterior' : 'Indoor';
      setExposureFeedback(`Work exposure set to ${label}`);
      setTimeout(() => setExposureFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update work exposure');
    } finally {
      setSavingExposure(false);
    }
  };

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white"
         aria-label="Back">
          <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticket.wo_number ? (
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
                {ticket.wo_number}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-mono font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                Unassigned WO
              </span>
            )}
            <span className="text-xs text-gray-400">ID #{ticket.id}</span>
            {locationText && (
              <span className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-tight">
                · {locationText}
              </span>
            )}
            {hasRepeatAccessProblem && (
              <span
                data-testid="detail-repeat-access-chip"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xs leading-none text-amber-600 dark:text-amber-400">warning</span>
                Repeat access problem
              </span>
            )}
            {unitContextChips.map(chip => (
              <span
                key={chip.key}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold rounded-md ${chip.className}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xs leading-none">{chip.icon}</span>
                {chip.key === 'renovated' ? (
                  <ExplainableTerm term="renovated">{chip.label}</ExplainableTerm>
                ) : (
                  chip.label
                )}
              </span>
            ))}
            {(ticket.appliance_name || ticket.appliance_model || ticket.appliance_id) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold rounded-md bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800">
                <span aria-hidden="true" className="material-symbols-outlined text-xs leading-none text-blue-600 dark:text-blue-400">kitchen</span>
                <span>
                  {ticket.appliance_name || 'Appliance'}
                  {ticket.appliance_model ? ` (${ticket.appliance_model})` : ''}
                </span>
              </span>
            )}
          </div>
          <h1 className="text-base font-bold text-brand-black dark:text-white truncate">
            {ticket.title}
          </h1>
        </div>

        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-xl flex items-center gap-1 shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
          Edit
        </button>
      </div>

      {/* Blocked Status Card with Aging Clock & Manual Prune Action */}
      {(ticket.status === 'blocked' || ticket.state === 'blocked') && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-rose-600 text-xl shrink-0 mt-0.5">block</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-rose-900 dark:text-rose-200">
                    Work Order Blocked
                  </span>
                  {ticket.blocked_at && (
                    <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100">
                      Clock started: {formatDate(ticket.blocked_at)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-1">
                  Reason: {ticket.blocked_reason || ticket.blocker_reason}
                </p>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                  Tickets blocked 30+ days automatically prune into permanent unit history and move to the archive.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualPrune}
              disabled={isPruning}
              className="min-h-[44px] px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95"
              title="Prune to history now before 30 days"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">history_edu</span>
              <span>{isPruning ? 'Pruning...' : 'Prune to history now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Archived-Blocked Notice Banner */}
      {(ticket.status === 'archived-blocked' || ticket.state === 'archived-blocked') && (
        <div className="p-4 rounded-2xl bg-gray-100 dark:bg-neutral-800/80 border border-gray-300 dark:border-gray-700 flex items-start gap-3 shadow-xs">
          <span aria-hidden="true" className="material-symbols-outlined text-gray-500 text-xl shrink-0 mt-0.5">inventory_2</span>
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-gray-800 dark:text-gray-200">
              Archived Work Order (Pruned to Unit History)
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This ticket is archived and preserved permanently. A consolidated copy of its scope, blocked reason, timeline, and parts is permanently recorded in the unit's history.
            </p>
          </div>
        </div>
      )}

      {/* Repeat Access Problem Warning Banner (Derived >= 2 failed visits) */}
      {hasRepeatAccessProblem && (
        <div
          data-testid="repeat-access-problem-banner"
          className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-3 shadow-xs animate-fadeIn"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl shrink-0 mt-0.5">warning</span>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Repeat Access Problem Flag (2+ Failed Attempts)
              </span>
              {ticket.unit_failed_visits_count !== undefined && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  {ticket.unit_failed_visits_count} failed visits
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              This unit has recorded repeated failed entry attempts. Confirm 24-hour advance written notice and tenant response before dispatching technician for next visit.
            </p>
          </div>
        </div>
      )}

      {/* Yardi Sighting Status Bar */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-sm text-gray-500">visibility</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Yardi Sighting
            </span>
          </div>

          <button
            onClick={handleStampYardiSighting}
            disabled={sightingStamping}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
           aria-label="History">
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">history</span>
            {sightingStamping ? 'Stamping...' : 'Stamp Sighting'}
          </button>
        </div>

        {sightingSuccessMsg && (
          <div className="text-xs text-emerald-600 font-medium">{sightingSuccessMsg}</div>
        )}

        {/* Warning if unseen >= 7 days */}
        {ticket.is_stale_yardi ? (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-amber-600 text-lg">warning</span>
            <div>
              <span className="font-bold">Unseen in Yardi (7+ days)</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {ticket.yardi_warning || 'Unseen in Yardi for 7+ days. Full local history is preserved.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
            {ticket.last_seen_in_yardi
              ? `Last verified in Yardi: ${formatDateTime(ticket.last_seen_in_yardi)}`
              : 'Status: Not yet seen in Yardi'}
          </p>
        )}
      </div>

      <TicketNoticeCard ticket={ticket} onTicketChange={onTicketChange} />

      {/* Work Exposure Card & Rain Signal */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
              {workExposure === 'exterior_ladder' ? 'stairs' : workExposure === 'exterior' ? 'wb_sunny' : 'roofing'}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark block">
                Work Exposure
              </span>
              <span className="text-xs text-gray-500">
                {workExposure === 'indoor'
                  ? 'Indoor job'
                  : workExposure === 'exterior'
                  ? 'Exterior ground-level job'
                  : 'Exterior job requiring ladder access'}
              </span>
            </div>
          </div>

          {/* Exposure Segmented Buttons */}
          <div className="inline-flex rounded-xl bg-gray-200/80 dark:bg-gray-800 p-1 gap-1">
            <button
              type="button"
              disabled={savingExposure}
              onClick={() => handleSetExposure('indoor')}
              className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                workExposure === 'indoor'
                  ? 'bg-white dark:bg-card-dark text-brand-black dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-brand-black dark:hover:text-white'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">roofing</span>
              <span>Indoor</span>
            </button>
            <button
              type="button"
              disabled={savingExposure}
              onClick={() => handleSetExposure('exterior')}
              className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                workExposure === 'exterior'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-sky-500'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">wb_sunny</span>
              <span>Exterior</span>
            </button>
            <button
              type="button"
              disabled={savingExposure}
              onClick={() => handleSetExposure('exterior_ladder')}
              className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                workExposure === 'exterior_ladder'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-500'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">stairs</span>
              <span>Ladder</span>
            </button>
          </div>
        </div>

        {exposureFeedback && (
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary dark:text-blue-300 text-xs flex items-center gap-1.5 animate-fadeIn">
            <span aria-hidden="true" className="material-symbols-outlined text-sm leading-none">info</span>
            <span>{exposureFeedback}</span>
          </div>
        )}

        {/* Rain Badge: ONLY on exterior or exterior_ladder when rain is expected */}
        {(workExposure === 'exterior' || workExposure === 'exterior_ladder') && rainExpected === true && (
          <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 font-bold animate-fadeIn">
            <span className="text-base leading-none">🌧️</span>
            <span>Rain Expected on Scheduled Day</span>
          </div>
        )}
      </div>

      {/* Quick Field Workflow Actions Bar */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap shadow-xs">
        <button
          type="button"
          onClick={onLogVisit}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">assignment_turned_in</span>
          Log Visit
        </button>
        <button
          type="button"
          onClick={onOrderPart}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">build</span>
          Order Part
        </button>
        <button
          type="button"
          onClick={onIdentify}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">photo_camera</span>
          Identify Appliance
        </button>
        {onRunSop && (
          <button
            type="button"
            onClick={() => onRunSop('sop-gas-furnace-service')}
            className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">fact_check</span>
            Run SOP
          </button>
        )}
      </div>


    </>
  );
};
