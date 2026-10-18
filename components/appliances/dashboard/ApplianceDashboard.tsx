import React from 'react';
import { Appliance } from '../../../types';
import { StatusCard } from './StatusCard';
import { InfoCard } from './InfoCard';
import { SensorGrid } from './SensorGrid';
import { ResourceBars } from './ResourceBars';

import { useApplianceSpecs } from './hooks/useApplianceSpecs';
import { useApplianceMetrics } from './hooks/useApplianceMetrics';

interface ApplianceDashboardProps {
    appliance: Appliance;
}

export const ApplianceDashboard: React.FC<ApplianceDashboardProps> = ({ appliance }) => {

    // Business Logic extracted to hooks (SRP)
    const { specs, activeAlerts } = useApplianceSpecs(appliance);
    const { status, efficiencyDisplay, healthFilter, metrics, isAlert, lastServiceDate } = useApplianceMetrics(appliance);

    return (
        <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-8 animate-in fade-in duration-500">
                {/* Right Side: Grid of modules */}
                <div className="md:col-span-6 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">

                    {/* Status Cards */}
                    <div>
                        <StatusCard
                            label="Overall Status"
                            value={status === 'optimal' ? 'Optimal' : 'Attention'}
                            status={status as any}
                            variant="filled"
                            icon={status === 'optimal' ? 'check_circle' : 'warning'}
                        />
                    </div>
                    <StatusCard
                        label={healthFilter}
                        value={efficiencyDisplay}
                        status="neutral"
                        icon="monitor_heart"
                    />

                    {/* Service & Alerts */}
                    <div className="relative">
                        <InfoCard
                            label="Last Service"
                            value={lastServiceDate}
                            icon="history"
                        />
                    </div>

                    <div className="relative">
                        <InfoCard
                            label="Active Alerts"
                            value={activeAlerts}
                            isAlert={isAlert}
                            icon={isAlert ? 'notifications_active' : 'notifications'}
                        />
                    </div>

                    {/* Specifications Grid */}
                    <div className="sm:col-span-2 relative">
                        <SensorGrid readings={specs} />
                    </div>
                </div>

                {/* Bottom Row: Metrics & Schematic */}
                <div className="md:col-span-12 lg:col-span-4 space-y-6">
                    <ResourceBars metrics={metrics} />
                </div>
            </div>
        </div>
    );
};

