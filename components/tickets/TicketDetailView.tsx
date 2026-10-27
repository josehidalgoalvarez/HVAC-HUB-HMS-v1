import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import type {
  Ticket,
  TicketState,
  TicketPriority,
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

const formatRunDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatRunDate = (iso: string): string => {
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' }) || iso;
};

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
  const [visitOutcome, setVisitOutcome] = useState<TicketVisitOutcome>('completed');
  const [visitReason, setVisitReason] = useState<TicketVisitReason>('tenant_absent');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [visitTechName, setVisitTechName] = useState('Jose (Tech)');
  const [visitSaving, setVisitSaving] = useState(false);

  // Order Part Modal State
  const [isOrderPartOpen, setIsOrderPartOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partSupplier, setPartSupplier] = useState<'Dependable' | 'Home Depot Gardiners Rd' | 'other'>('Dependable');
  const [customSupplier, setCustomSupplier] = useState('');
  const [partOrderRef, setPartOrderRef] = useState('');
  const [partApplianceType, setPartApplianceType] = useState('Refrigerator');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partUnitCost, setPartUnitCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [partSaving, setPartSaving] = useState(false);

  // Appliance Identification Modal State
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);
  const [appliancePhotoUrl, setAppliancePhotoUrl] = useState('');
  const [ratingPlateUrl, setRatingPlateUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [identifyNotes, setIdentifyNotes] = useState('');
  const [identifySaving, setIdentifySaving] = useState(false);

  // Work Exposure & Rain Signal State
  const [workExposure, setWorkExposure] = useState<'indoor' | 'exterior' | 'exterior_ladder'>('indoor');
  const [rainExpected, setRainExpected] = useState<boolean | null>(null);
  const [savingExposure, setSavingExposure] = useState(false);
  const [exposureFeedback, setExposureFeedback] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editWoNumber, setEditWoNumber] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [editState, setEditState] = useState<TicketState>('new');
  const [editScope, setEditScope] = useState('');
  const [editBlocker, setEditBlocker] = useState('');
  const [editExposure, setEditExposure] = useState<'indoor' | 'exterior' | 'exterior_ladder'>('indoor');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add Child Modal State
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [childState, setChildState] = useState<TicketState>('in-progress');
  const [childPriority, setChildPriority] = useState<TicketPriority>('medium');
  const [childBlocker, setChildBlocker] = useState('');
  const [childSaving, setChildSaving] = useState(false);

  // Sighting Stamp State
  const [sightingStamping, setSightingStamping] = useState(false);
  const [sightingSuccessMsg, setSightingSuccessMsg] = useState<string | null>(null);

  // Notice Sent-Tracking State
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [markSentTime, setMarkSentTime] = useState<string>('');
  const [markConfirmedBy, setMarkConfirmedBy] = useState<string>('');
  const [noticeFeedback, setNoticeFeedback] = useState<string | null>(null);

  // SOP runs completed against this ticket
  const [sopRuns, setSopRuns] = useState<SOPRun[]>([]);
  const [sopRunsLoading, setSopRunsLoading] = useState(false);
  const [sopRunsError, setSopRunsError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  const handleToggleNoticeNeeded = async (needed: boolean) => {
    if (!ticket) return;
    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const updated = await apiClient.updateTicket(ticket.id, {
        notice_needed: needed,
        reason: needed ? 'Toggled 24h notice needed ON' : 'Toggled 24h notice needed OFF',
      });
      setTicket(prev => prev ? { ...prev, ...updated, notice_needed: needed } : prev);
      setNoticeFeedback(needed ? '24h Notice required: entry blocked until marked sent.' : 'Notice requirement turned off: entry permitted.');
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update notice status');
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleSaveMarkSent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!markConfirmedBy.trim()) {
      alert('Please enter who confirmed the notice was sent.');
      return;
    }

    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const sentIso = markSentTime ? new Date(markSentTime).toISOString() : new Date().toISOString();
      const confirmedName = markConfirmedBy.trim();

      const updated = await apiClient.updateTicket(ticket.id, {
        notice_sent_at: sentIso,
        notice_confirmed_by: confirmedName,
        reason: `Notice marked sent at ${sentIso} confirmed by ${confirmedName}`,
      });

      setTicket(prev => prev ? {
        ...prev,
        ...updated,
        notice_sent_at: sentIso,
        notice_confirmed_by: confirmedName,
      } : prev);

      setIsMarkingSent(false);
      setMarkConfirmedBy('');
      setMarkSentTime('');
      setNoticeFeedback(`Notice marked sent! Confirmed by ${confirmedName}. 24h countdown active.`);
      setTimeout(() => setNoticeFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record notice sent');
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleClearNoticeSent = async () => {
    if (!ticket) return;
    if (!window.confirm('Clear notice sent status and reset the 24h entry gate?')) {
      return;
    }

    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const updated = await apiClient.updateTicket(ticket.id, {
        notice_sent_at: null,
        notice_confirmed_by: null,
        reason: 'Cleared 24h notice sent status (undo)',
      });

      setTicket(prev => prev ? {
        ...prev,
        ...updated,
        notice_sent_at: null,
        notice_confirmed_by: null,
      } : prev);

      setNoticeFeedback('Notice sent status cleared. Entry gate reset to blocked.');
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to clear notice sent status');
    } finally {
      setNoticeSaving(false);
    }
  };

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

  const loadSopRuns = async () => {
    try {
      setSopRunsLoading(true);
      setSopRunsError(null);
      const runs = await apiClient.getSopRuns({ ticket_id: ticketId });
      setSopRuns(runs || []);
    } catch (err: unknown) {
      setSopRunsError(err instanceof Error ? err.message : 'Failed to load SOP runs');
    } finally {
      setSopRunsLoading(false);
    }
  };

  useEffect(() => {
    loadSopRuns();
  }, [ticketId]);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      setVisitSaving(true);
      await apiClient.logTicketVisit(ticket.id, {
        outcome: visitOutcome,
        failure_reason: visitOutcome === 'failed_access' ? visitReason : undefined,
        notes: visitNotes.trim() || undefined,
        visited_at: visitedAt ? new Date(visitedAt).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        tech_name: visitTechName.trim() || 'Jose (Tech)',
      });
      setIsLogVisitOpen(false);
      setVisitNotes('');
      setVisitedAt('');
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to log visit');
    } finally {
      setVisitSaving(false);
    }
  };

  const handleOrderPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!partName.trim()) {
      alert('Part name is required');
      return;
    }
    const supplier = partSupplier === 'other' ? (customSupplier.trim() || 'Other Supplier') : partSupplier;
    try {
      setPartSaving(true);
      await apiClient.orderTicketPart(ticket.id, {
        part_name: partName.trim(),
        part_number: partNumber.trim() || undefined,
        supplier,
        order_ref: partOrderRef.trim() || undefined,
        appliance_type: partApplianceType,
        quantity: partQuantity || 1,
        unit_cost: partUnitCost ? parseFloat(partUnitCost) : undefined,
        notes: partNotes.trim() || undefined,
      });
      setIsOrderPartOpen(false);
      setPartName('');
      setPartNumber('');
      setPartOrderRef('');
      setCustomSupplier('');
      setPartNotes('');
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to order part');
    } finally {
      setPartSaving(false);
    }
  };

  const handleMarkPartArrived = async (partId: number | string) => {
    if (!ticket) return;
    try {
      await apiClient.markTicketPartArrived(partId);
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark part arrived');
    }
  };

  const handleIdentifyAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      setIdentifySaving(true);
      await apiClient.appendTicketTimeline(ticket.id, {
        event_type: 'appliance_identified',
        actor: 'Jose (Tech)',
        note: identifyNotes.trim() || 'Appliance identified and documented with field data',
        metadata: {
          photo_url: appliancePhotoUrl.trim() || undefined,
          rating_plate_url: ratingPlateUrl.trim() || undefined,
          manual_url: manualUrl.trim() || undefined,
        },
      });
      setIsIdentifyOpen(false);
      setAppliancePhotoUrl('');
      setRatingPlateUrl('');
      setManualUrl('');
      setIdentifyNotes('');
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to identify appliance');
    } finally {
      setIdentifySaving(false);
    }
  };

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

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

  const openEditModal = () => {
    if (!ticket) return;
    setEditTitle(ticket.title || '');
    setEditWoNumber(ticket.wo_number || '');
    setEditPriority(ticket.priority || 'medium');
    setEditState((ticket.status || ticket.state || 'new') as TicketState);
    setEditScope(ticket.verified_scope || '');
    setEditBlocker(ticket.blocker_reason || '');
    setEditExposure((ticket.work_exposure || (ticket.exterior_work ? 'exterior' : 'indoor')) as 'indoor' | 'exterior' | 'exterior_ladder');
    setEditReason('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setEditSaving(true);
    try {
      const payload: Partial<Ticket> & { reason: string } = {
        title: editTitle.trim(),
        wo_number: editWoNumber.trim() || null,
        priority: editPriority,
        status: editState,
        verified_scope: editScope.trim() || null,
        blocker_reason: editState === 'blocked' ? editBlocker.trim() : null,
        work_exposure: editExposure,
        exterior_work: editExposure !== 'indoor',
        reason: editReason.trim() || 'Updated ticket details',
      };

      const updated = await apiClient.updateTicket(ticket.id, payload);
      setTicket(updated);
      setWorkExposure(editExposure);

      if (editExposure === 'exterior' || editExposure === 'exterior_ladder') {
        const scheduledDate = updated?.scheduled_date || (updated?.scheduled_at ? updated.scheduled_at.slice(0, 10) : undefined);
        apiClient.checkRainExpected(scheduledDate).then(setRainExpected).catch(() => setRainExpected(null));
      } else {
        setRainExpected(null);
      }

      setIsEditModalOpen(false);

      // Refresh correction history
      const freshCorrections = await apiClient.getTicketCorrections(ticket.id);
      setCorrections(freshCorrections || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!childTitle.trim()) return;

    setChildSaving(true);
    try {
      await apiClient.createChildTicket(ticket.id, {
        title: childTitle.trim(),
        status: childState,
        priority: childPriority,
        blocker_reason: childState === 'blocked' ? childBlocker.trim() : null,
      });

      setIsAddChildOpen(false);
      setChildTitle('');
      setChildBlocker('');

      // Reload ticket hierarchy and rollup
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create child ticket');
    } finally {
      setChildSaving(false);
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
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
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

  const rollup = ticket.childrenRollup || (ticket as any).rollup;
  const children = ticket.children || [];
  const building = ticket.buildingName || ticket.building_name || ticket.propertyName || '';
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
        >
          <span className="material-symbols-outlined">arrow_back</span>
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
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
              >
                <span className="material-symbols-outlined text-[11px] leading-none text-amber-600 dark:text-amber-400">warning</span>
                Repeat access problem
              </span>
            )}
            {unitContextChips.map(chip => (
              <span
                key={chip.key}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${chip.className}`}
              >
                <span className="material-symbols-outlined text-[11px] leading-none">{chip.icon}</span>
                {chip.label}
              </span>
            ))}
          </div>
          <h1 className="text-base font-bold text-brand-black dark:text-white truncate">
            {ticket.title}
          </h1>
        </div>

        <button
          onClick={openEditModal}
          className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-xl flex items-center gap-1 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Edit
        </button>
      </div>

      {/* Repeat Access Problem Warning Banner (Derived >= 2 failed visits) */}
      {hasRepeatAccessProblem && (
        <div
          data-testid="repeat-access-problem-banner"
          className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-3 shadow-xs animate-fadeIn"
        >
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl shrink-0 mt-0.5">warning</span>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Repeat Access Problem Flag (2+ Failed Attempts)
              </span>
              {ticket.unit_failed_visits_count !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
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
            <span className="material-symbols-outlined text-sm text-gray-500">visibility</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Yardi Sighting
            </span>
          </div>

          <button
            onClick={handleStampYardiSighting}
            disabled={sightingStamping}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">history</span>
            {sightingStamping ? 'Stamping...' : 'Stamp Sighting'}
          </button>
        </div>

        {sightingSuccessMsg && (
          <div className="text-xs text-emerald-600 font-medium">{sightingSuccessMsg}</div>
        )}

        {/* Warning if unseen >= 7 days */}
        {ticket.is_stale_yardi ? (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
            <div>
              <span className="font-bold">Unseen in Yardi (7+ days)</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
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

      {/* Notice of Entry Card (24-Hour Legal Gate Tracker) */}
      {(() => {
        const isVacant = ticket.unit_occupancy_status === 'vacant' || ticket.unit?.occupancy_status === 'vacant';
        const isNoticeNeeded = !isVacant && !!ticket.notice_needed;
        const noticeSentAt = ticket.notice_sent_at || null;
        const noticeConfirmedBy = ticket.notice_confirmed_by || null;

        let gateBadge = {
          label: 'NO NOTICE REQUIRED',
          className: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300',
          description: 'Entry permitted — no 24h notice required for this work order.',
          cleared: true,
        };

        if (isVacant) {
          gateBadge = {
            label: 'NOT APPLICABLE (VACANT)',
            className: 'bg-emerald-500 text-white',
            description: 'Unit is vacant — no tenant to notify. Entry legally cleared without 24h notice.',
            cleared: true,
          };
        } else if (isNoticeNeeded) {
          if (!noticeSentAt) {
            gateBadge = {
              label: 'ENTRY BLOCKED',
              className: 'bg-brand-red text-white',
              description: 'Notice required but not yet sent. Tenant entry prohibited.',
              cleared: false,
            };
          } else {
            const parsedSent = parseDate(noticeSentAt);
            const sentTime = parsedSent ? parsedSent.getTime() : NaN;
            if (!isNaN(sentTime)) {
              const hoursElapsed = (Date.now() - sentTime) / (1000 * 60 * 60);
              const validFrom = new Date(sentTime + 24 * 60 * 60 * 1000);
              const validFromFormatted = formatDateTime(validFrom, {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              if (hoursElapsed >= 24) {
                gateBadge = {
                  label: 'CLEARED (24H MET)',
                  className: 'bg-emerald-500 text-white',
                  description: `Entry window open since ${validFromFormatted} (${hoursElapsed.toFixed(1)}h elapsed).`,
                  cleared: true,
                };
              } else {
                const hoursRemaining = Math.max(0, 24 - hoursElapsed);
                gateBadge = {
                  label: `LOCKED (${Math.ceil(hoursRemaining)}H LEFT)`,
                  className: 'bg-amber-500 text-white',
                  description: `Entry permitted starting ${validFromFormatted} (${hoursRemaining.toFixed(1)}h remaining).`,
                  cleared: false,
                };
              }
            } else {
              gateBadge = {
                label: 'ENTRY BLOCKED',
                className: 'bg-brand-red text-white',
                description: 'Notice timestamp invalid. Re-confirm notice sent time.',
                cleared: false,
              };
            }
          }
        }

        return (
          <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-3">
            {/* Header row: Icon, Title, and Legal Gate Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">schedule</span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark block">
                    24h Notice of Entry
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {isVacant
                      ? 'Vacant unit — no tenant to notify (entry permitted)'
                      : (isNoticeNeeded ? 'Tenant-occupied — 24h advance notice required' : 'Notice of entry not required')}
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 ${gateBadge.className}`}>
                {gateBadge.label}
              </span>
            </div>

            {/* Notice Needed Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex-1 pr-3">
                <label htmlFor="notice-needed-toggle" className="text-xs font-bold text-brand-black dark:text-white block cursor-pointer">
                  Notice needed
                </label>
                <p className="text-[11px] text-gray-500">
                  {isVacant
                    ? 'Unit is vacant — 24h notice not applicable'
                    : isNoticeNeeded
                    ? 'Entry gated until 24h after management sends notice'
                    : 'Turn ON if unit requires 24h written notice'}
                </p>
              </div>

              <button
                id="notice-needed-toggle"
                type="button"
                role="switch"
                aria-checked={isNoticeNeeded}
                onClick={() => !isVacant && handleToggleNoticeNeeded(!isNoticeNeeded)}
                disabled={noticeSaving || isVacant}
                className={`relative inline-flex h-7 w-12 shrink-0 ${isVacant ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isNoticeNeeded ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isNoticeNeeded ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {noticeFeedback && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary dark:text-sky-300 text-xs flex items-center gap-1.5 animate-fadeIn">
                <span className="material-symbols-outlined text-sm leading-none">info</span>
                <span>{noticeFeedback}</span>
              </div>
            )}

            {/* When Notice is Needed */}
            {isNoticeNeeded && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
                {/* If Sent: Show sent details and clear/undo action */}
                {noticeSentAt ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/80 border border-gray-200 dark:border-gray-700 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-black dark:text-white">
                          <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                          <span>
                            Sent — {formatDateTime(noticeSentAt, { dateStyle: 'short', timeStyle: 'short' })} — confirmed by <span className="text-primary">{noticeConfirmedBy || 'Management'}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 pl-5">
                          {gateBadge.description}
                        </p>
                      </div>

                      <button
                        onClick={handleClearNoticeSent}
                        disabled={noticeSaving}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-brand-red dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-300 rounded-xl transition-colors shrink-0"
                        title="Clear sent status (Undo)"
                      >
                        Clear / Undo
                      </button>
                    </div>
                  </div>
                ) : (
                  /* If Needed + Not Sent: Show Mark as sent action */
                  <div>
                    {!isMarkingSent ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-200 block">
                            Notice pending
                          </span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            Management sends notice. Mark sent here to start 24h clock.
                          </span>
                        </div>

                        <button
                          id="mark-notice-sent-btn"
                          onClick={() => {
                            setIsMarkingSent(true);
                            const now = new Date();
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                            setMarkSentTime(localNow);
                          }}
                          className="min-h-[44px] px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Mark as sent</span>
                        </button>
                      </div>
                    ) : (
                      /* Form to capture sent timestamp & confirmed by */
                      <form onSubmit={handleSaveMarkSent} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/90 border border-primary/30 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary">mark_email_read</span>
                            Confirm Notice Sent
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsMarkingSent(false)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Sent Date & Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={markSentTime}
                              onChange={e => setMarkSentTime(e.target.value)}
                              className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Confirmed by (Name) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Maria (Management) / Jose"
                              value={markConfirmedBy}
                              onChange={e => setMarkConfirmedBy(e.target.value)}
                              className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsMarkingSent(false)}
                            disabled={noticeSaving}
                            className="flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={noticeSaving}
                            className="flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl bg-primary hover:bg-blue-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>{noticeSaving ? 'Saving...' : 'Confirm Notice Sent'}</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Work Exposure Card & Rain Signal */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">
              {workExposure === 'exterior_ladder' ? 'stairs' : workExposure === 'exterior' ? 'wb_sunny' : 'roofing'}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark block">
                Work Exposure
              </span>
              <span className="text-[11px] text-gray-500">
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
              <span className="material-symbols-outlined text-[15px]">roofing</span>
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
              <span className="material-symbols-outlined text-[15px]">wb_sunny</span>
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
              <span className="material-symbols-outlined text-[15px]">stairs</span>
              <span>Ladder</span>
            </button>
          </div>
        </div>

        {exposureFeedback && (
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary dark:text-blue-300 text-xs flex items-center gap-1.5 animate-fadeIn">
            <span className="material-symbols-outlined text-sm leading-none">info</span>
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
          <span className="material-symbols-outlined text-base">assignment_turned_in</span>
          Log Visit
        </button>
        <button
          type="button"
          onClick={() => setIsOrderPartOpen(true)}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-base">build</span>
          Order Part
        </button>
        <button
          type="button"
          onClick={() => setIsIdentifyOpen(true)}
          className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-base">photo_camera</span>
          Identify Appliance
        </button>
        {onRunSop && (
          <button
            type="button"
            onClick={() => onRunSop('sop-gas-furnace-service')}
            className="flex-1 min-w-[120px] min-h-[44px] px-3 py-2 text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-base">fact_check</span>
            Run SOP
          </button>
        )}
      </div>

      {/* Primary Details Card */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Status:</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
              {ticket.status || ticket.state}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Priority:</span>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-lg uppercase ${
                ticket.priority === 'urgent'
                  ? 'bg-brand-red text-white'
                  : ticket.priority === 'high'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {ticket.priority}
            </span>
          </div>
        </div>

        {/* Verified Scope Section */}
        {ticket.verified_scope ? (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 border border-primary/20">
            <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
              <span className="material-symbols-outlined text-sm">verified</span>
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
              onClick={openEditModal}
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
        {ticket.blocker_reason && (
          <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-200 dark:border-rose-900 text-xs text-brand-red">
            <span className="font-bold block mb-1">Active Blocker:</span>
            <p>{ticket.blocker_reason}</p>
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

      {/* Parts Needed & Ordered (Auto-Created Watches) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-xl">shopping_cart</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Parts Needed & Ordered
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
              {parts.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOrderPartOpen(true)}
            className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-white rounded-xl shadow-xs hover:bg-amber-600 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
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
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        #{p.part_number}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {p.appliance_type || 'Appliance'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                        p.status === 'arrived'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                    <span>Supplier: <strong className="text-brand-black dark:text-white">{p.supplier}</strong></span>
                    {p.order_ref && <span>Ref: <strong className="font-mono text-brand-black dark:text-white">{p.order_ref}</strong></span>}
                    <span>Qty: <strong>{p.quantity}</strong></span>
                    {p.ordered_at && <span>Ordered: {formatDate(p.ordered_at)}</span>}
                    {p.watch_id && (
                      <span className="text-primary font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        Watch #{p.watch_id} {p.status === 'arrived' ? '(Resolved)' : '(Active)'}
                      </span>
                    )}
                  </div>

                  {p.notes && <p className="text-[11px] text-gray-400 italic">Note: {p.notes}</p>}
                </div>

                {p.status === 'ordered' && (
                  <button
                    type="button"
                    onClick={() => handleMarkPartArrived(p.id)}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1 shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    Mark Arrived
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOP Runs on this ticket (renders nothing when there are none) */}
      {(sopRunsLoading || sopRunsError || sopRuns.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              SOP runs
            </h2>
            {sopRuns.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {sopRuns.length}
              </span>
            )}
          </div>

          {sopRunsLoading && sopRuns.length === 0 && (
            <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
              Loading SOP runs...
            </div>
          )}

          {sopRunsError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
              <span className="flex-1 min-w-0">Could not load SOP runs: {sopRunsError}</span>
              <button
                type="button"
                onClick={loadSopRuns}
                className="min-h-[44px] px-3 font-bold text-primary"
              >
                Retry
              </button>
            </div>
          )}

          {sopRuns.map((run, runIdx) => {
            const expanded = run.id !== undefined && expandedRunId === run.id;
            const steps = run.steps || [];
            const deviationCount = steps.filter((s) => s.deviation).length;
            const gateCount = (run.acknowledged_gates || []).length;
            return (
              <div
                key={run.id ?? runIdx}
                className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedRunId(expanded ? null : (run.id ?? null))}
                  className="w-full min-h-[44px] text-left p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-bold text-brand-black dark:text-white truncate">{run.sop_title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRunDate(run.started_at)} · {run.technician}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">timer</span>
                        {formatRunDuration(run.total_seconds)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">checklist</span>
                        {steps.length} steps
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          deviationCount > 0
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">warning</span>
                        {deviationCount} {deviationCount === 1 ? 'deviation' : 'deviations'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">verified</span>
                        {gateCount} {gateCount === 1 ? 'gate' : 'gates'} acknowledged
                      </span>
                    </div>
                    {run.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{run.notes}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-400 shrink-0" aria-hidden="true">
                    {expanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Steps</h3>
                      {steps.length === 0 && (
                        <p className="text-xs text-gray-400">No step records for this run.</p>
                      )}
                      {steps.map((step) => (
                        <div
                          key={step.id ?? step.position}
                          className={`p-3 rounded-xl border ${
                            step.deviation
                              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-neutral-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-primary shrink-0">{step.position}.</span>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-brand-black dark:text-white">{step.instruction}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs" aria-hidden="true">timer</span>
                                  {formatRunDuration(step.duration_seconds)}
                                </span>
                                {step.deviation && (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                                    <span className="material-symbols-outlined text-xs" aria-hidden="true">warning</span>
                                    Deviation
                                  </span>
                                )}
                              </div>
                              {step.note && (
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap">Note: {step.note}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Gates acknowledged</h3>
                      {gateCount === 0 ? (
                        <p className="text-xs text-gray-400">None recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {run.acknowledged_gates.map((gate) => (
                            <span key={gate} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-mono">
                              {gate}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {(run.weather_warnings || []).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Weather warnings at start</h3>
                        <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-200 list-disc pl-5">
                          {run.weather_warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {run.notes && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Overall notes</h3>
                        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{run.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Timeline (Append-Only Events) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">timeline</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Ticket Timeline
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {timeline.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-400">Append-Only Provenance</span>
        </div>

        {timeline.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No events recorded yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs relative">
            <div className="absolute top-6 bottom-6 left-[27px] w-0.5 bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-5">
              {timeline.map((ev, idx) => {
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
                      <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0 bg-gray-50/70 dark:bg-neutral-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-brand-black dark:text-white">
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-gray-500">by {ev.actor}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
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
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
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
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono text-[10px]">
                              outcome: {meta.outcome}
                            </span>
                          )}
                          {meta.failure_reason && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-mono text-[10px]">
                              reason: {meta.failure_reason}
                            </span>
                          )}
                          {meta.supplier && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 text-[10px]">
                              Supplier: {meta.supplier}
                            </span>
                          )}
                          {meta.order_ref && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                              Ref: {meta.order_ref}
                            </span>
                          )}
                          {meta.photo_url && (
                            <a
                              href={meta.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">image</span>
                              Photo
                            </a>
                          )}
                          {meta.rating_plate_url && (
                            <a
                              href={meta.rating_plate_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">badge</span>
                              Rating Plate
                            </a>
                          )}
                          {meta.manual_url && (
                            <a
                              href={meta.manual_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">menu_book</span>
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

      {/* Parent-Child Hierarchy (WO 19970 Pattern) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Sub-Jobs
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
              {children.length}
            </span>
          </div>

          <button
            onClick={() => setIsAddChildOpen(true)}
            className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-primary/90 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Sub-Job
          </button>
        </div>

        {/* Parent Rollup Summary Bar */}
        {rollup && rollup.total > 0 && (
          <div className="bg-primary/5 dark:bg-card-dark p-3 rounded-2xl border border-primary/20 flex items-center justify-around text-center text-xs">
            <div>
              <span className="block text-lg font-extrabold text-brand-black dark:text-white">
                {rollup.total}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Total</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {rollup.in_progress ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">In Progress</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-rose-600 dark:text-rose-400">
                {rollup.blocked ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Blocked</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {rollup.done ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Done</span>
            </div>
          </div>
        )}

        {/* Children Tickets List */}
        {children.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No sub-jobs attached. Tap "+ Add Sub-Job" to break this job down.
          </div>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <div
                key={child.id}
                onClick={() => onOpenTicket?.(child.id)}
                className="bg-white dark:bg-card-dark rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-2 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-brand-black dark:text-white truncate">
                      {child.title}
                    </span>
                  </div>
                  {child.blocker_reason && (
                    <p className="text-[11px] text-brand-red truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">warning</span>
                      Blocker: {child.blocker_reason}
                    </p>
                  )}
                  {child.assigned_tech_name && (
                    <p className="text-[10px] text-gray-400">
                      Tech: {child.assigned_tech_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                      child.status === 'done' || child.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : child.status === 'blocked'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : child.status === 'in-progress' || child.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {child.status || child.state}
                  </span>
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Append-Only Correction Audit Log Timeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
          <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
            Edit History
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
            {corrections.length}
          </span>
        </div>

        {corrections.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No edits made to this ticket yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
            {corrections.map((corr) => (
              <div
                key={corr.id}
                className="text-xs pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span className="font-mono font-bold text-primary">
                    field: {corr.fieldName || (corr as any).field_name}
                  </span>
                  <span>{formatDateTime(corr.createdAt || (corr as any).created_at)}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                  <span className="text-red-500 line-through truncate max-w-[140px]">
                    {corr.oldValue ?? (corr as any).old_value ?? 'null'}
                  </span>
                  <span className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                  <span className="text-emerald-500 font-bold truncate max-w-[140px]">
                    {corr.newValue ?? (corr as any).new_value ?? 'null'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    By: {corr.changedBy || (corr as any).changed_by_name || 'System / Tech'}
                  </span>
                  {corr.reason && <span className="italic">"{corr.reason}"</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Field Modal */}
      {isEditModalOpen && (
        <Modal onClose={() => setIsEditModalOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-brand-black dark:text-white">Edit Ticket</h2>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WO Number</label>
                <input
                  type="text"
                  value={editWoNumber}
                  onChange={(e) => setEditWoNumber(e.target.value)}
                  placeholder="e.g. WO-19970"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">State</label>
                <select
                  value={editState}
                  onChange={(e) => setEditState(e.target.value as TicketState)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-semibold"
                >
                  <option value="new">New</option>
                  <option value="verified">Verified</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On-Hold</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                  <option value="closed-elsewhere">Closed-Elsewhere</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {editState === 'blocked' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-red mb-1">Blocker Reason</label>
                  <input
                    type="text"
                    value={editBlocker}
                    onChange={(e) => setEditBlocker(e.target.value)}
                    placeholder="e.g. Parts on order"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-primary mb-1">
                Verified Scope (Confirmed Description)
              </label>
              <textarea
                value={editScope}
                onChange={(e) => setEditScope(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-primary/40 bg-primary/5 dark:bg-primary/10"
              />
            </div>

            {/* Work Exposure Selector in Edit Modal */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Work Exposure
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditExposure('indoor')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'indoor'
                      ? 'bg-white dark:bg-gray-700 text-brand-black dark:text-white border-primary shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">roofing</span>
                  <span>Indoor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditExposure('exterior')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'exterior'
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">wb_sunny</span>
                  <span>Exterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditExposure('exterior_ladder')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'exterior_ladder'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">stairs</span>
                  <span>Ladder</span>
                </button>
              </div>
            </div>

            {/* MANDATORY REASON FOR EDIT */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold uppercase text-brand-black dark:text-white mb-1">
                Reason for change <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Why is this field being modified? (e.g. Scope confirmed on site)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                required
              />
              <span className="text-[10px] text-gray-400">
                Required: every change is permanently logged in the correction audit trail.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs shadow-md"
                disabled={editSaving}
              >
                {editSaving ? 'Saving...' : 'Save & Log Correction'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Child Ticket Modal */}
      {isAddChildOpen && (
        <Modal onClose={() => setIsAddChildOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Add Sub-Job</h2>
              <p className="text-xs text-gray-400">Parent: {ticket.wo_number || `#${ticket.id}`}</p>
            </div>
            <button
              onClick={() => setIsAddChildOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateChild} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Sub-Job Title <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                placeholder="e.g. Zone 2 Condenser Coil Replacement"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial State</label>
                <select
                  value={childState}
                  onChange={(e) => setChildState(e.target.value as TicketState)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                >
                  <option value="new">New</option>
                  <option value="verified">Verified</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On-Hold</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={childPriority}
                  onChange={(e) => setChildPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {childState === 'blocked' && (
              <div>
                <label className="block text-xs font-bold uppercase text-brand-red mb-1">Blocker Reason</label>
                <input
                  type="text"
                  value={childBlocker}
                  onChange={(e) => setChildBlocker(e.target.value)}
                  placeholder="e.g. Waiting on refrigerant shipment"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddChildOpen(false)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs shadow-md"
                disabled={childSaving}
              >
                {childSaving ? 'Adding...' : 'Attach Sub-Job'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Field Visit Modal */}
      {isLogVisitOpen && (
        <Modal onClose={() => setIsLogVisitOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">assignment_turned_in</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Log Field Visit</h2>
            </div>
            <button
              onClick={() => setIsLogVisitOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleLogVisit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Visit Outcome <span className="text-brand-red">*</span>
              </label>
              <select
                value={visitOutcome}
                onChange={(e) => setVisitOutcome(e.target.value as TicketVisitOutcome)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-semibold"
              >
                <option value="completed">Completed (Work finished, ready to close)</option>
                <option value="partial">Partial (In progress, requires return visit)</option>
                <option value="failed_access">Failed Access (Could not enter unit)</option>
              </select>
            </div>

            {/* If Failed Access: Select Reason and Snapshot Notice State */}
            {visitOutcome === 'failed_access' && (
              <div className="space-y-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold uppercase text-amber-900 dark:text-amber-200 mb-1">
                    Failed Access Reason <span className="text-brand-red">*</span>
                  </label>
                  <select
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value as TicketVisitReason)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-card-dark font-semibold"
                  >
                    <option value="tenant_absent">Tenant absent</option>
                    <option value="no_answer">No answer at door</option>
                    <option value="refused_entry">Tenant refused entry</option>
                    <option value="key_or_lock_issue">Key or lock issue</option>
                    <option value="access_blocked">Access physically blocked</option>
                    <option value="unsafe">Unsafe conditions</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                {/* Notice State Snapshot and Provenance Check */}
                {ticket.notice_needed && !ticket.notice_sent_at ? (
                  <div className="p-3 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-base shrink-0 mt-0.5">error</span>
                    <div>
                      <strong className="block uppercase tracking-wider font-extrabold text-[11px]">[OUR MISS — MANAGEMENT/DISPATCH]</strong>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        Notice was required on this unit but was never sent. This will display as <strong>OUR miss</strong>, not the tenant's refusal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800/60 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-brand-black dark:text-white">Notice Snapshot: </span>
                    {ticket.notice_needed
                      ? `Notice sent at ${ticket.notice_sent_at ? formatDateTime(ticket.notice_sent_at) : 'N/A'}`
                      : 'Notice not required (or vacant unit)'}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Visited Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={visitedAt}
                  onChange={(e) => setVisitedAt(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Technician
                </label>
                <input
                  type="text"
                  value={visitTechName}
                  onChange={(e) => setVisitTechName(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Visit Notes
              </label>
              <textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Findings, diagnostics, or follow-up details..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsLogVisitOpen(false)}
                className="flex-1 min-h-[44px] py-2 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 min-h-[44px] py-2 text-xs font-bold shadow-sm"
                disabled={visitSaving}
              >
                {visitSaving ? 'Recording...' : 'Log Visit'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order Part Modal (Auto-Creates Part-Wait Watch) */}
      {isOrderPartOpen && (
        <Modal onClose={() => setIsOrderPartOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-xl">shopping_cart</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Order Part</h2>
            </div>
            <button
              onClick={() => setIsOrderPartOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleOrderPart} className="mt-4 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              💡 Ordering a part automatically logs a timeline event and creates a <strong>part-wait watch</strong>.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Appliance Type <span className="text-brand-red">*</span>
                </label>
                <select
                  value={partApplianceType}
                  onChange={(e) => setPartApplianceType(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                >
                  <option value="Refrigerator">Refrigerator</option>
                  <option value="Range / Stove">Range / Stove</option>
                  <option value="Dishwasher">Dishwasher</option>
                  <option value="HVAC / Heat Pump">HVAC / Heat Pump</option>
                  <option value="Water Heater">Water Heater</option>
                  <option value="Washer / Dryer">Washer / Dryer</option>
                  <option value="General Appliance">General Appliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Supplier <span className="text-brand-red">*</span>
                </label>
                <select
                  value={partSupplier}
                  onChange={(e) => setPartSupplier(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                >
                  <option value="Dependable">Dependable</option>
                  <option value="Home Depot Gardiners Rd">Home Depot Gardiners Rd</option>
                  <option value="other">Other Supplier...</option>
                </select>
              </div>
            </div>

            {partSupplier === 'other' && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Custom Supplier Name
                </label>
                <input
                  type="text"
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  placeholder="e.g. Reliable Parts, WW Grainger"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Part Name / Description <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. Defrost timer, igniter coil, blower capacitor"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Part # (Optional)
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. WPW10366605"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Order Ref (Optional)
                </label>
                <input
                  type="text"
                  value={partOrderRef}
                  onChange={(e) => setPartOrderRef(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Est. Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={partUnitCost}
                  onChange={(e) => setPartUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="Shipping details, tracking #, or special instructions..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOrderPartOpen(false)}
                className="flex-1 min-h-[44px] py-2 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 min-h-[44px] py-2 text-xs font-bold shadow-sm"
                disabled={partSaving}
              >
                {partSaving ? 'Ordering...' : 'Place Order & Watch'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Identify Appliance Modal */}
      {isIdentifyOpen && (
        <Modal onClose={() => setIsIdentifyOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-xl">photo_camera</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Appliance Identified</h2>
            </div>
            <button
              onClick={() => setIsIdentifyOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleIdentifyAppliance} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Appliance Photo URL
              </label>
              <input
                type="text"
                value={appliancePhotoUrl}
                onChange={(e) => setAppliancePhotoUrl(e.target.value)}
                placeholder="https://... or /uploads/photo.jpg"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Rating-Plate Photo URL
              </label>
              <input
                type="text"
                value={ratingPlateUrl}
                onChange={(e) => setRatingPlateUrl(e.target.value)}
                placeholder="https://... or /uploads/rating-plate.jpg"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Manufacturer Manual Link
              </label>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://manuals.brand.com/model123.pdf"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Field Identification Notes
              </label>
              <textarea
                rows={2}
                value={identifyNotes}
                onChange={(e) => setIdentifyNotes(e.target.value)}
                placeholder="Model # confirmed, serial plate verified on left cabinet interior..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsIdentifyOpen(false)}
                className="flex-1 min-h-[44px] py-2 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 min-h-[44px] py-2 text-xs font-bold shadow-sm"
                disabled={identifySaving}
              >
                {identifySaving ? 'Saving...' : 'Record to Timeline'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
