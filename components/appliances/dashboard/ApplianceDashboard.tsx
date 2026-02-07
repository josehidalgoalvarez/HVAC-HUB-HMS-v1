import React, { useState, useEffect, useMemo } from 'react';
import { Appliance } from '../../../types';
import { StatusCard } from './StatusCard';
import { InfoCard } from './InfoCard';
import { SensorGrid, SensorReading } from './SensorGrid';
import { ResourceBars, ResourceMetric } from './ResourceBars';
import { DEFAULT_HVAC_SPECS, DEFAULT_HEATER_SPECS, DEFAULT_GENERIC_SPECS } from '../../../residential_constants';

interface ApplianceDashboardProps {
    appliance: Appliance;
}

export const ApplianceDashboard: React.FC<ApplianceDashboardProps> = ({ appliance }) => {

    // Initialize with defaults, in a real app these would be stateful from DB
    const [specs, setSpecs] = useState<SensorReading[]>([]);
    const [lastServiceDate, setLastServiceDate] = useState('N/A');
    const [activeAlerts, setActiveAlerts] = useState('None');

    // Derived status state (simplified for demo, normally complex logic)
    const [currentStatus, setCurrentStatus] = useState<'optimal' | 'warning' | 'critical' | 'neutral'>(
        appliance.status === 'Needs Service' ? 'warning' : 'optimal'
    );

    // Initialize Specs based on helper function to map domain fields to dashboard
    useEffect(() => {
        if (!appliance.specs) {
            setSpecs([]);
            return;
        }

        const s = appliance.specs;
        const newSpecs: SensorReading[] = [];

        // Helper to push if exists
        const addSpec = (key: string, label: string, value?: string, unit: string = '') => {
            if (value) {
                // Try to extract unit if inside string (e.g. "120V")
                let val = value;
                let u = unit;

                // Simple heuristic: if value ends with non-digits and unit is empty, try to split
                const match = value.match(/^([\d.,]+)\s*([a-zA-Z%°\/\.]*)?$/);
                if (match && !unit) {
                    val = match[1];
                    u = match[2] || '';
                }

                newSpecs.push({
                    id: key,
                    label,
                    value: val,
                    unit: u
                });
            }
        };

        // --- Electrical ---
        addSpec('volts', 'Voltage', s.volts);
        addSpec('maxUnitAmp', 'Max Amps', s.maxUnitAmp);
        addSpec('watts', 'Power', s.watts);
        addSpec('hertz', 'Frequency', s.hertz);
        addSpec('phase', 'Phase', s.phase);

        // --- Mechanical ---
        addSpec('motorHp', 'Motor HP', s.motorHp);
        addSpec('fanSpeed', 'Fan Speed', s.fanSpeed);

        // --- HVAC / Performance ---
        addSpec('returnTemp', 'Return Temp', s.returnTemp);
        addSpec('supplyTemp', 'Supply Temp', s.supplyTemp);
        addSpec('staticPressure', 'Static Pressure', s.staticPressure);
        addSpec('airTempRise', 'Temp Rise', s.airTempRise);

        // --- Hydronics ---
        addSpec('waterTemp', 'Water Temp', s.waterTemp);
        addSpec('systemPressure', 'System Pressure', s.systemPressure);
        addSpec('flowRate', 'Flow Rate', s.flowRate);
        addSpec('gasValve', 'Gas Valve', s.gasValve);

        // --- Maintenance ---
        addSpec('refrigerantType', 'Refrigerant', s.refrigerantType);
        addSpec('filterSize', 'Filter Size', s.filterSize);

        // Fallback to constants ONLY if absolutely no matching specs found (unlikely now)
        if (newSpecs.length === 0) {
            const isHVAC = appliance.type === 'HVAC' || appliance.type === 'AC' || appliance.type === 'Furnace';
            const isHeater = appliance.type === 'Heater';
            if (isHVAC) setSpecs(JSON.parse(JSON.stringify(DEFAULT_HVAC_SPECS)));
            else if (isHeater) setSpecs(JSON.parse(JSON.stringify(DEFAULT_HEATER_SPECS)));
            else setSpecs(JSON.parse(JSON.stringify(DEFAULT_GENERIC_SPECS)));
        } else {
            setSpecs(newSpecs);
        }

        // Initial Alert Check
        if (appliance.status === 'Needs Service') {
            setActiveAlerts('Filter Change Req.');
        }

    }, [appliance]);


    // Metrics Calculation
    const dashboardData = useMemo(() => {
        const isHVAC = appliance.type === 'HVAC' || appliance.type === 'AC' || appliance.type === 'Furnace';

        // Load Capacity Calculation
        // Logic: 100% from install date (or lastService as fallback), decays to 0% over 365 days
        let loadCapacity = 0;
        const referenceDateStr = appliance.lastService || appliance.specs?.installDate;

        if (referenceDateStr) {
            const referenceDate = new Date(referenceDateStr);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - referenceDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Decaying 100% over 365 days -> Capacity = 100 - (days/365 * 100)
            const decay = (diffDays / 365) * 100;
            loadCapacity = Math.max(0, Math.round(100 - decay));
        }

        // Efficiency vs Filter Life Logic
        // For HVAC: "Filter Life" is the time-decayed value. "Efficiency" is the static rating (e.g. 96% AFUE).
        // For others: Display "Efficiency" as the main status metric if relevant, or just use the static rating.

        const healthFilter = isHVAC ? 'Filter Life' : 'Efficiency';

        // Manual Efficiency from Specs or default
        const staticEfficiency = appliance.specs?.efficiency || 'Standard';

        // If HVAC, the big status card shows Filter Life (calculated).
        // If not HVAC (e.g. Water Heater), it shows the static Efficiency rating.
        const efficiencyDisplay = isHVAC ? `${loadCapacity}%` : staticEfficiency;

        const isAlert = currentStatus === 'warning' || currentStatus === 'critical' || loadCapacity === 0;

        // Resource Metrics Calculation
        // Try to parse efficiency string for the bar chart
        let effMetricValue = 0;
        const effMatch = staticEfficiency.match(/(\d+(\.\d+)?)/);
        if (effMatch) {
            const num = parseFloat(effMatch[0]);
            if (staticEfficiency.includes('%')) effMetricValue = num;
            else if (num <= 1) effMetricValue = num * 100; // e.g. 0.96 -> 96%
            else if (num > 10 && num < 30) effMetricValue = (num / 25) * 100; // Rough SEER mapping (25 SEER = 100%)
            else effMetricValue = loadCapacity; // Fallback
        } else {
            effMetricValue = loadCapacity;
        }

        const metrics: ResourceMetric[] = [
            { label: 'Energy Efficiency', value: effMetricValue, color: '#1a9387' },
            { label: 'Load Capacity', value: loadCapacity, color: '#3b82f6' },
        ];
        // CO2 Emission Removed per request

        return {
            status: currentStatus,
            efficiencyDisplay,
            healthFilter,
            metrics,
            isAlert
        };
    }, [appliance, currentStatus]);

    return (
        <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-8 animate-in fade-in duration-500">
                {/* Right Side: Grid of modules */}
                <div className="md:col-span-6 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">

                    {/* Status Cards */}
                    <div>
                        <StatusCard
                            label="Overall Status"
                            value={dashboardData.status === 'optimal' ? 'Optimal' : 'Attention'}
                            status={dashboardData.status as any}
                            variant="filled"
                            icon={dashboardData.status === 'optimal' ? 'check_circle' : 'warning'}
                        />
                    </div>
                    <StatusCard
                        label={dashboardData.healthFilter}
                        value={dashboardData.efficiencyDisplay}
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
                            isAlert={dashboardData.isAlert}
                            icon={dashboardData.isAlert ? 'notifications_active' : 'notifications'}
                        />
                    </div>

                    {/* Specifications Grid (Combined with SensorGrid logic) */}
                    <div className="sm:col-span-2 relative">
                        <SensorGrid readings={specs} />
                    </div>
                </div>

                {/* Bottom Row: Metrics & Schematic */}
                <div className="md:col-span-12 lg:col-span-4">
                    <ResourceBars metrics={dashboardData.metrics} />
                </div>
            </div>
        </div>
    );
};
