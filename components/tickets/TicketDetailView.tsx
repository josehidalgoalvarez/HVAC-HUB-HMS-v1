import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../src/api/client';
import { useData } from '../../hooks/useData';
import { useModalState } from '../../hooks/useModalState';
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
import { TicketHeaderSection } from './detail/TicketHeaderSection';
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
  const visitModal = useModalState();

  // Order Part Modal State
  const [isOrderPartOpen, setIsOrderPartOpen] = useState(false);

  // Appliance Identification Modal State
  const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);

  // Work Exposure & Rain Signal State

  // Edit Modal State
  const { units, getUnitAppliances } = useData();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Child Modal State

  // Sighting Stamp State


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
      if (exposure === 'exterior' || exposure === 'exterior_ladder') {
        const scheduledDate = tData?.scheduled_date || (tData?.scheduled_at ? tData.scheduled_at.slice(0, 10) : undefined);
      } else {
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
      <TicketHeaderSection
        ticket={ticket}
        locationText={locationText}
        hasRepeatAccessProblem={hasRepeatAccessProblem}
        unitContextChips={unitContextChips}
        onBack={onBack}
        onRunSop={onRunSop}
        onTicketChange={(next) => setTicket(next)}
        onEdit={() => setIsEditModalOpen(true)}
        onLogVisit={visitModal.open}
        onOrderPart={() => setIsOrderPartOpen(true)}
        onIdentify={() => setIsIdentifyOpen(true)}
        onPruned={loadTicketData}
      />
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
      <TicketVisitModal ticketId={ticketId} noticeNeeded={ticket.notice_needed} noticeSentAt={ticket.notice_sent_at} open={visitModal.isOpen} onClose={visitModal.close} onSaved={loadTicketData} />
      <TicketOrderPartModal ticketId={ticketId} open={isOrderPartOpen} onClose={() => setIsOrderPartOpen(false)} onSaved={loadTicketData} />
      <TicketIdentifyModal ticketId={ticketId} open={isIdentifyOpen} onClose={() => setIsIdentifyOpen(false)} onSaved={loadTicketData} />

      {/* Add Child Ticket Modal */}

      {/* Log Field Visit Modal */}

      {/* Order Part Modal (Auto-Creates Part-Wait Watch) */}

      {/* Identify Appliance Modal */}

    </div>
  );
};
