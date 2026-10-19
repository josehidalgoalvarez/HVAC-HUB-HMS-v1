import { ViewType } from './types';

export type TutorialStep = {
    target: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    view?: ViewType;
    action?: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        target: '#ticket-intake-banner',
        title: 'Rapid Intake (< 2 min)',
        content: 'Snap a photo of a dispatch text or rating plate to auto-extract tenant details, unit, and equipment automatically.',
        position: 'bottom',
        view: ViewType.TICKETS
    },
    {
        target: '#ticket-list',
        title: 'Tickets & 24h Notice Gate',
        content: 'Ontario tenant law compliance. Generate legal Entry Notices and track the mandatory 24-hour delivery window before dispatching.',
        position: 'top',
        view: ViewType.TICKETS
    },
    {
        target: '#day-plan-container',
        title: 'Smart Day Plan & Proximity Order',
        content: 'Cluster jobs by building (1719–1737 Bath Rd & Days Rd) so technicians never backtrack across the portfolio.',
        position: 'top',
        view: ViewType.RUN_SHEET
    },
    {
        target: '#property-list',
        title: 'Property Equipment',
        content: 'Tap any property card to view its Equipment Inventory, detailed rating plate specs, and exact room locations.',
        position: 'center',
        view: ViewType.PROPERTIES
    },
    {
        target: '#parts-container',
        title: 'Stockpile Inventory & Close-out',
        content: 'Check parts availability across trucks and base stockpiles, decrement used parts on jobs, and close out work orders.',
        position: 'center',
        view: ViewType.PARTS
    }
];
