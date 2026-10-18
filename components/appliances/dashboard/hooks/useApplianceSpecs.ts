import { useState, useEffect } from 'react';
import { Appliance } from '../../../../types';
import { SensorReading } from '../SensorGrid';
import { DEFAULT_HVAC_SPECS, DEFAULT_HEATER_SPECS, DEFAULT_GENERIC_SPECS } from '../../../../residential_constants';

export const useApplianceSpecs = (appliance: Appliance) => {
    const [specs, setSpecs] = useState<SensorReading[]>([]);
    const [activeAlerts, setActiveAlerts] = useState('None');

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

        // Fallback to constants ONLY if absolutely no matching specs found
        if (newSpecs.length === 0) {
            const isHVAC = appliance.type === 'HVAC' || appliance.type === 'AC' || appliance.type === 'Furnace';
            const isHeater = appliance.type === 'Heater';
            if (isHVAC) setSpecs(JSON.parse(JSON.stringify(DEFAULT_HVAC_SPECS)));
            else if (isHeater) setSpecs(JSON.parse(JSON.stringify(DEFAULT_HEATER_SPECS)));
            else setSpecs(JSON.parse(JSON.stringify(DEFAULT_GENERIC_SPECS)));
        } else {
            setSpecs(newSpecs);
        }

        if (appliance.status === 'needs_service') {
            setActiveAlerts('Filter Change Req.');
        } else {
            setActiveAlerts('None');
        }

    }, [appliance]);

    return { specs, activeAlerts };
};
