import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../src/api/client';
import { useData } from '../../hooks/useData';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import type {
  Ticket,
  TicketState,
  TicketPriority,
  ClosedByParty,
  Correction,
  TicketTimelineEvent,
  TicketVisit,
  TicketVisitOutcome,
  TicketVisitReason,
  TicketPart,
  SOPRun,
} from '../../types/domain';
import { getUnitContextChips } from '../../utils/unitContextUtils';
import { parseDate, formatDateTime, formatTime, formatDate } from '../../utils/dateUtils';
import { ExplainableTerm } from '../common/ExplainableTerm';
import { TicketStatusBadge, TicketPriorityBadge } from './TicketStatusBadges';
import { TicketTimelineSection } from './detail/TicketTimelineSection';
import { TicketCorrectionsSection } from './detail/TicketCorrectionsSection';
import { TicketSopRunsSection } from './detail/TicketSopRunsSection';
import { TicketPartsSection } from './detail/TicketPartsSection';
import { TicketRelatedSection } from './detail/TicketRelatedSection';
import { TicketNoticeCard } from './detail/TicketNoticeCard';
import { TicketSubJobsSection } from './detail/TicketSubJobsSection';
import { TicketEditModal } from './detail/TicketEditModal';
import { TicketVisitModal } from './detail/TicketVisitModal';
import { TicketOrderPartModal } from './detail/TicketOrderPartModal';
import { TicketIdentifyModal } from './detail/TicketIdentifyModal';

interface TicketDetailViewProps {
  ticketId: string;
  onBack: () => void;
  onOpenTicket?: (id: string) => void;
  onRunSop?: (sopId?: string) => void;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticketId,
  onBack,
  onOpenTicket,
  onRunSop,
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Field Workflow State (Timeline, Visits, Parts)
  const [timeline, setTimeline] = useState<TicketTimelineEvent[]>([]);
  const [visits, setVisits] = useState<TicketVisit[]>([]);
  const [parts, setParts] = useState<TicketPart[]>([]);

  // Log Visit Modal State
  const [isLogVisitOpen, setIsLogVisitOpen] = useState(false);

  // Order Part Modal State
  const [isOrderPartOpen, setIsOrderPartOpen] = useState(false);

  // Appliance Identification Modal State
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);

  // Work Exposure & Rain Signal State
  const [workExposure, setWorkExposure] = useState<'indoor' | 'exterior' | 'exterior_ladder'>('indoor');
  const [rainExpected, setRainExpected] = useState<boolean | null>(null);
  const [savingExposure, setSavingExposure] = useState(false);
  const [exposureFeedback, setExposureFeedback] = useState<string | null>(null);

  // Edit Modal State
  const { units, getUnitAppliances } = useData();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Child Modal State

  // Sighting Stamp State
  const [sightingStamping, setSightingStamping] = useState(false);

  const [sightingSuccessMsg, setSightingSuccessMsg] = useState<string | null>(null);


  const loadTicketData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tData, cData, tlData, vData, pData] = await Promise.all([
        apiClient.getTicket(ticketId),
        apiClient.getTicketCorrections(ticketId),
        apiClient.getTicketTimeline(ticketId).catch(() => []),
        apiClient.getTicketVisits(ticketId).catch(() => []),
        apiClient.getTicketParts(ticketId).catch(() => []),
      ]);
      setTicket(tData);
      setCorrections(cData || []);
      setTimeline(tlData || []);
      setVisits(vData || []);
      setParts(pData || []);
      const exposure = (tData?.work_exposure || (tData?.exterior_work ? 'exterior' : 'indoor')) as 'indoor' | 'exterior' | 'exterior_ladder';
      setWorkExposure(exposure);
      if (exposure === 'exterior' || exposure === 'exterior_ladder') {
        const scheduledDate = tData?.scheduled_date || (tData?.scheduled_at ? tData.scheduled_at.slice(0, 10) : undefined);
        apiClient.checkRainExpected(scheduledDate).then(setRainExpected).catch(() => setRainExpected(null));
      } else {
        setRainExpected(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ticket details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);


  useEffect(() => {
  }, [ticketId]);



  const handleMarkPartArrived = async (part: any) => {
    if (!ticket) return;
    const partName = part.part_name || 'Part';
    const woLabel = ticket.wo_number ? `WO #${ticket.wo_number}` : `Ticket #${ticket.id}`;
    const confirmed = window.confirm(
      `Mark "${partName}" as arrived for ${ticket.title} (${woLabel})?`
    );
    if (!confirmed) return;

    try {
      await apiClient.markTicketPartArrived(part.id);
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark part arrived');
    }
  };

  const handleUndoPartArrived = async (part: any) => {
    if (!ticket) return;
    const partName = part.part_name || 'Part';
    try {
      await apiClient.unmarkTicketPartArrived(part.id);
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to undo arrival for ${partName}`);
    }
  };


  const handleSetExposure = async (newExp: 'indoor' | 'exterior' | 'exterior_ladder') => {
    if (!ticket || newExp === workExposure) return;
    setSavingExposure(true);
    setExposureFeedback(null);
    try {
      const updated = await apiClient.updateTicket(ticketId, {
        work_exposure: newExp,
        exterior_work: newExp !== 'indoor',
        reason: `Changed work exposure to ${newExp}`,
      });
      setTicket(updated);
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


  const [isPruning, setIsPruning] = useState(false);

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
      setTicket(updated);
      await loadTicketData();
      alert('Ticket successfully pruned to unit history and archived.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to prune ticket');
    } finally {
      setIsPruning(false);
    }
  };



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
      await loadTicketData();
      setTimeout(() => setSightingSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to stamp Yardi sighting');
    } finally {
      setSightingStamping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <span aria-hidden="true" className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
        <p className="text-sm font-medium">Loading ticket details & hierarchy...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 text-brand-red text-sm">
          {error || 'Ticket not found.'}
        </div>
        <Button variant="secondary" onClick={onBack} fullWidth>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const matchedUnit = useMemo(() => {
    if (!ticket) return null;
    const uId = ticket.unit_id || ticket.unitId;
    if (uId) {
      const byId = units.find(u => String(u.id) === String(uId));
      if (byId) return byId;
    }
    const bId = ticket.building_id || ticket.buildingId;
    const uNum = ticket.unitNumber || ticket.unit_number;
    if (bId && uNum) {
      return units.find(u =>
        String(u.buildingId) === String(bId) &&
        u.unitNumber?.toLowerCase() === String(uNum).toLowerCase()
      ) || null;
    }
    return null;
  }, [units, ticket]);

  const unitAppliances = useMemo(() => {
    if (!matchedUnit) return [];
    return getUnitAppliances(matchedUnit);
  }, [matchedUnit, getUnitAppliances]);
  const rollup = ticket.childrenRollup || (ticket as any).rollup;
  const children = ticket.children || [];
  const building = ticket.building_name || '';
  const unitNum = ticket.unitNumber || ticket.unit_number;
  const locationText = unitNum ? `${building} · Unit ${unitNum}` : building;
  const unitContextChips = getUnitContextChips(ticket.unit || ticket);
  const hasRepeatAccessProblem = Boolean(
    ticket.has_repeat_access_problem ||
    ticket.repeat_access_problem ||
    ticket.unit?.has_repeat_access_problem ||
    ticket.unit?.repeat_access_problem ||
    ((ticket.unit_failed_visits_count ?? 0) >= 2) ||
    ((ticket.unit?.failed_visits_count ?? 0) >= 2)
  );

  return (
    <div className="pb-safe max-w-xl mx-auto px-4 py-4 space-y-5 animate-fadeIn">
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
          onClick={() => setIsEditModalOpen(true)}
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

      <TicketNoticeCard ticket={ticket} onTicketChange={(next) => setTicket(next)} />

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
          onClick={() => setIsLogVisitOpen(true)}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">assignment_turned_in</span>
          Log Visit
        </button>
        <button
          type="button"
          onClick={() => setIsOrderPartOpen(true)}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">build</span>
          Order Part
        </button>
        <button
          type="button"
          onClick={() => setIsIdentifyOpen(true)}
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

      {/* Primary Details Card */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Status:</span>
            <TicketStatusBadge
              status={ticket.status || ticket.state}
              closedByParty={ticket.closed_by_party}
              variant="detail"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Priority:</span>
            <TicketPriorityBadge priority={ticket.priority} variant="detail" />
          </div>
        </div>

        {/* Completing party metadata for closed-elsewhere tickets */}
        {(ticket.status === 'closed-elsewhere' || ticket.state === 'closed-elsewhere') && (
          <div className="flex items-center gap-2 pt-1 pb-1 text-xs">
            <span className="font-bold text-gray-500">Completed By Party:</span>
            <span className="font-semibold text-brand-black dark:text-white">
              {ticket.closed_by_party ? (
                ticket.closed_by_party === 'coworker'
                  ? 'Coworker'
                  : ticket.closed_by_party
              ) : (
                <span className="text-gray-400 italic">Not recorded</span>
              )}
            </span>
          </div>
        )}

        {/* Verified Scope Section */}
        {ticket.verified_scope ? (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 border border-primary/20">
            <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
              <span aria-hidden="true" className="material-symbols-outlined text-sm">verified</span>
              Verified Scope:
            </span>
            <p className="text-sm font-medium text-brand-black dark:text-white">
              {ticket.verified_scope}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">No verified scope recorded yet.</span>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline"
            >
              + Confirm Scope
            </button>
          </div>
        )}

        {/* Verbatim Screenshot Text */}
        {ticket.verbatim_text && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-500 block mb-1">
              Intake Text:
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 italic">
              "{ticket.verbatim_text}"
            </p>
          </div>
        )}

        {/* Blocker Reason if present */}
        {(ticket.blocked_reason || ticket.blocker_reason) && (
          <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-200 dark:border-rose-900 text-xs text-brand-red">
            <span className="font-bold block mb-1">Active Blocker:</span>
            <p>{ticket.blocked_reason || ticket.blocker_reason}</p>
          </div>
        )}

        {/* Photo attachment preview */}
        {ticket.photo_url && (
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1.5">Intake Screenshot Photo:</span>
            <img
              src={ticket.photo_url}
              alt="Intake Screenshot"
              className="max-h-48 rounded-xl object-contain border border-gray-200 dark:border-gray-700 shadow-sm"
            />
          </div>
        )}
      </div>

      <TicketPartsSection
        parts={parts}
        onOrderPart={() => setIsOrderPartOpen(true)}
        onMarkArrived={handleMarkPartArrived}
        onUndoArrived={handleUndoPartArrived}
      />
      <TicketSopRunsSection ticketId={ticketId} onRunSop={onRunSop} />
      <TicketTimelineSection events={timeline} />

      <TicketSubJobsSection ticket={ticket} onOpenTicket={onOpenTicket} onChildCreated={loadTicketData} />

      <TicketRelatedSection
        ticketId={ticketId}
        initialRelated={ticket?.related_tickets ?? []}
        buildingId={ticket?.building_id}
        parentTicketId={ticket?.parent_ticket_id}
        childIds={children.map((c) => Number(c.id))}
        onSelectTicket={onOpenTicket}
      />

      {/* Append-Only Correction Audit Log Timeline */}
      <TicketCorrectionsSection corrections={corrections} />

      {/* Edit Field Modal */}
      <TicketEditModal ticket={ticket} unitAppliances={unitAppliances} open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSaved={loadTicketData} />
      <TicketVisitModal ticketId={ticketId} noticeNeeded={ticket.notice_needed} noticeSentAt={ticket.notice_sent_at} open={isLogVisitOpen} onClose={() => setIsLogVisitOpen(false)} onSaved={loadTicketData} />
      <TicketOrderPartModal ticketId={ticketId} open={isOrderPartOpen} onClose={() => setIsOrderPartOpen(false)} onSaved={loadTicketData} />
      <TicketIdentifyModal ticketId={ticketId} open={isIdentifyOpen} onClose={() => setIsIdentifyOpen(false)} onSaved={loadTicketData} />

      {/* Add Child Ticket Modal */}

      {/* Log Field Visit Modal */}

      {/* Order Part Modal (Auto-Creates Part-Wait Watch) */}

      {/* Identify Appliance Modal */}

    </div>
  );
};
