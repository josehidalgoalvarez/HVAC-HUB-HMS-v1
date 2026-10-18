import { ViewType } from './types';

export type TutorialStep = {
    target: string; // ID or class to highlight
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    view?: ViewType; // Navigation target
    action?: string; // Special actions like 'OPEN_NOTES' or 'SELECT_PROPERTY'
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        target: 'body',
        title: 'Welcome to HVACHome',
        content: 'This tutorial will guide you through the main features of the application. You are now in "Superpower Mode" with sample data loaded.',
        position: 'center',
        view: ViewType.PROPERTIES
    },
    {
        target: '#property-list',
        title: 'Property List',
        content: 'Your portfolio starts here. We have loaded a few sample properties for you to explore.',
        position: 'center',
        view: ViewType.PROPERTIES
    },
    {
        target: '#property-card-0', // Targeting the first property card
        title: 'Property Equipment', // Renamed to match UI
        content: 'Clicking on a property opens its detailed view. Let\'s look at "The Modern Gas Home".',
        position: 'center',
        view: ViewType.PROPERTY_DETAIL,
        action: 'SELECT_SAMPLE_PROPERTY'
    },
    {
        target: '#appliance-list',
        title: 'Appliance Inventory',
        content: 'See all appliances at a glance. We automatically sort them by category.',
        position: 'center',
        view: ViewType.APPLIANCES
    },
    {
        target: '#appliance-card-gas-app-1', // Targeting first appliance (Gas Furnace)
        title: 'Deep Dive',
        content: 'Let\'s check the specific details of the High-Efficiency Gas Furnace.',
        position: 'center',
        view: ViewType.APPLIANCE_DETAIL,
        action: 'SELECT_SAMPLE_APPLIANCE'
    },
    {
        target: '#doc-notes-btn',
        title: 'Technician Notes',
        content: 'This is a Superpower feature! Edit and view technical notes, stored securely for each appliance.',
        position: 'top',
        view: ViewType.APPLIANCE_DETAIL,
        action: 'OPEN_NOTES'
    },
    {
        target: '#profile-nav-item', // Assuming this ID exists in nav
        title: 'Back to Profile',
        content: 'You can manage your settings and exit the tutorial from your profile.',
        position: 'top',
        view: ViewType.PROFILE
    },
    {
        target: 'body',
        title: 'You are Ready!',
        content: 'Explore the app freely. Click "Exit" to return to your personal data.',
        position: 'center',
        view: ViewType.PROFILE
    }
];
