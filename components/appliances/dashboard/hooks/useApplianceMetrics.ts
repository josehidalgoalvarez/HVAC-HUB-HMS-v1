import { useState, useMemo } from 'react';
import { Appliance } from '../../../../types';
import { ResourceMetric } from '../ResourceBars';

export const useApplianceMetrics = (appliance: Appliance) => {
    // Derived status state
    let currentStatus: 'optimal' | 'warning' | 'critical' | 'neutral' = 'optimal';
    if (appliance.status === 'needs_service') currentStatus = 'warning';
    else if (appliance.status === 'error') currentStatus = 'critical';
    else if (appliance.status === 'idle') currentStatus = 'neutral';

    // Last Service Date (could be formatted here)
    const lastServiceDate = appliance.lastService || 'N/A';

    const dashboardData = useMemo(() => {
        const isHVAC = appliance.type === 'HVAC' || appliance.type === 'AC' || appliance.type === 'Furnace';

        // Load Capacity Calculation
        // Logic: 100% from install date (or lastService as fallback), decays to 0% over 365 days
        let lifetime = 0;
        const referenceDateStr = appliance.lastService || appliance.specs?.installDate;

        if (referenceDateStr) {
            const referenceDate = new Date(referenceDateStr);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - referenceDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Decaying 100% over 365 days -> Capacity = 100 - (days/365 * 100)
            const decay = (diffDays / 365) * 100;
            lifetime = Math.max(0, Math.round(100 - decay));
        }

        // Efficiency vs Filter Life Logic
        const healthFilter = isHVAC ? 'Filter Life' : 'Efficiency';

        // Manual Efficiency from Specs or default
        const staticEfficiency = appliance.specs?.efficiency || 'Standard';

        // If HVAC, the big status card shows Filter Life (calculated).
        // If not HVAC (e.g. Water Heater), it shows the static Efficiency rating.
        const efficiencyDisplay = isHVAC ? `${lifetime}%` : staticEfficiency;

        const isAlert = currentStatus === 'warning' || currentStatus === 'critical' || lifetime === 0;

        // Resource Metrics Calculation
        // Try to parse efficiency string for the bar chart
        let effMetricValue = 0;
        const effMatch = staticEfficiency.match(/(\d+(\.\d+)?)/);
        if (effMatch) {
            const num = parseFloat(effMatch[0]);
            if (staticEfficiency.includes('%')) effMetricValue = num;
            else if (num <= 1) effMetricValue = num * 100; // e.g. 0.96 -> 96%
            else if (num > 10 && num < 30) effMetricValue = (num / 25) * 100; // Rough SEER mapping (25 SEER = 100%)
            else effMetricValue = lifetime; // Fallback
        } else {
            effMetricValue = lifetime;
        }

        const metrics: ResourceMetric[] = [
            { label: 'Energy Efficiency', value: effMetricValue, color: '#1a9387' },
            { label: 'Lifetime Remaining', value: lifetime, color: '#3b82f6' },
        ];

        return {
            status: currentStatus,
            efficiencyDisplay,
            healthFilter,
            metrics,
            isAlert
        };
    }, [appliance, currentStatus]);

    return {
        ...dashboardData,
        lastServiceDate
    };
};
