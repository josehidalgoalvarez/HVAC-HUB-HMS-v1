import { SOP } from './types/domain';

export const SEED_SOPS: SOP[] = [
  {
    id: 'sop-gas-furnace-service',
    title: 'Gas furnace service (CSA B149.1-25 / TSSA)',
    category: 'Gas / HVAC',
    version: 2,
    required_tools: [
      'Socket set and ratchet (various sizes for burner fasteners)',
      'Soft brass wire brush (for burner cleaning)',
      'Compressed air source with regulator (40-60 PSI)',
      'Shop vacuum with attachments',
      'Digital multimeter or voltage tester',
      'Digital thermometer or temperature clamp meters (2 required)',
      'Manometer for gas pressure measurement',
      'Feeler gauge set (for igniter gap measurement)',
      'Non-sparking LED flashlight or work light',
      'Endoscope or inspection mirror',
      'Leak detection solution (approved soap/water or commercial)',
      'Camera or smartphone for documentation',
      'CSA-approved safety glasses',
      'Work gloves',
      'Screwdrivers (various sizes and types)',
      'ULC S636 approved transition cement or RTV high-temp sealant (for condensing units)'
    ],
    required_parts: [],
    access_requirements: [],
    compliance_gates: [
      {
        id: 'csa-b149-1-25',
        label: 'CSA B149.1-25',
        reference: 'CSA B149.1-25, Ontario Regulation 212/01, and TSSA requirements',
        requirement: 'All work must comply with CSA B149.1-25, Ontario Regulation 212/01, and TSSA requirements.'
      },
      {
        id: 'tssa-gas',
        label: 'TSSA',
        reference: 'Ontario Regulation 215/01, Sections 20-22',
        requirement: 'Only certified G.2 or G.3 technicians may perform this work. G.3: may perform basic maintenance including filter changes, visual inspections, and cleaning under direct supervision of a G.2 or G.1 certificate holder. G.2: may install, inspect, alter, purge, activate, repair, service, or remove natural gas or propane appliances up to 400,000 BTU/hr input. G.1: may perform all functions on appliances of any BTU input; required for systems over 400,000 BTU/hr.'
      }
    ],
    weather_exposure: null,
    two_person: null,
    todo_verify: 1,
    source_note: 'Provided by Jose 2026-10-26 in session; transcribed faithfully, nothing invented.',
    steps: [
      {
        sop_id: 'sop-gas-furnace-service',
        position: 1,
        instruction: 'Document furnace identification: Make, Model, Serial Number, Efficiency Rating, Input Capacity, Ignition System type',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 2,
        instruction: 'Record initial operational status and customer complaints',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 3,
        instruction: 'Photograph furnace nameplate and current condition',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 4,
        instruction: 'Set thermostat to lowest setting to initiate furnace shutdown',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 5,
        instruction: 'Verify display reads \'0\' (standby mode) or control is OFF',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 6,
        instruction: 'Turn manual gas valve to OFF position',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 7,
        instruction: 'MANDATORY: Wait minimum 5 minutes for gas dissipation',
        est_minutes: 5,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 8,
        instruction: 'Disconnect electrical supply at breaker or disconnect switch',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 9,
        instruction: 'Tag breaker/disconnect to prevent accidental re-energization',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 10,
        instruction: 'Verify no voltage present using voltage tester',
        est_minutes: null,
        phase: 'Phase I: Pre-Service Assessment & Safety Shutdown',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 11,
        instruction: 'Remove access panels systematically. Store fasteners with corresponding panels for correct reassembly',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 12,
        instruction: 'Photograph interior before disassembly for reassembly reference',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 13,
        instruction: 'Disconnect igniter wire carefully. Document igniter position and orientation',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 14,
        instruction: 'Measure igniter electrode gap using feeler gauges. Required gap: 0.110 inch ± 0.005 inch (2.79mm)',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 15,
        instruction: 'Document gap measurement. Replace igniter if gap cannot be set to specification',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 16,
        instruction: 'Remove retaining brackets securing burner assembly',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 17,
        instruction: 'Remove burners sequentially from farthest to closest to gas valve',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 18,
        instruction: 'Number or mark burners to ensure correct reinstallation position',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 19,
        instruction: 'Inspect each burner for carbon deposits, port blockage, physical damage, fin condition',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 20,
        instruction: 'Inspect heat exchanger through burner openings using endoscope and flashlight',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 21,
        instruction: 'Look for cracks, holes, excessive rust, carbon buildup, or other defects',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 22,
        instruction: 'For condensing furnaces: Inspect condensate drain system, trap, and connections for blockage or leaks',
        est_minutes: null,
        phase: 'Phase II: Disassembly & Initial Inspection',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 23,
        instruction: 'Clean burner faces using soft brass wire brush. Do not use steel brushes on brass burners',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 24,
        instruction: 'Remove carbon deposits gently to avoid damaging burner surface or port geometry',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 25,
        instruction: 'Use compressed air (40-60 PSI maximum) to blow debris from burner interior and crossovers',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 26,
        instruction: 'Inspect burner ports for blockage. Use appropriate tool to clear blocked ports without enlarging them',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 27,
        instruction: 'Clean burner fins and surfaces using soft brush and vacuum',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 28,
        instruction: 'Clean heat exchanger coil surfaces accessible through burner opening using soft brass brush',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 29,
        instruction: 'Use compressed air and vacuum to remove loose debris from heat exchanger passages',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 30,
        instruction: 'For condensing units: Clean condensate trap and drain lines. Verify proper drainage',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 31,
        instruction: 'Inspect and clean flame sensor rod. Use fine emery cloth or steel wool if necessary',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 32,
        instruction: 'Check all burner components for wear or damage. Replace as needed',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 33,
        instruction: 'For Lennox G51MP or similar: Apply ULC S636 approved transition cement or RTV high-temp sealant to flue collar connections to prevent acidic condensate leakage',
        est_minutes: null,
        phase: 'Phase III: Cleaning & Maintenance',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 34,
        instruction: 'Reinstall burners in correct positions. Align tabs carefully - do not force',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 35,
        instruction: 'Verify each burner is centered in burner ports and seated properly',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 36,
        instruction: 'Torque burner fasteners to specification: 15-25 ft-lbs (or per manufacturer spec)',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 37,
        instruction: 'Reinstall igniter in documented position',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 38,
        instruction: 'Set igniter electrode gap to 0.110 inch (2.79mm) using feeler gauge',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 39,
        instruction: 'Verify gap is positioned in hatched area relative to burner face (per manufacturer diagram)',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 40,
        instruction: 'Secure igniter electrical connection',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 41,
        instruction: 'Reconnect flame sensor and verify clean, tight connection',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 42,
        instruction: 'Perform final verification: Check all fasteners tight, all gaps correct, no tools left in furnace',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 43,
        instruction: 'Ensure all gaskets in place and safety switches properly engage',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 44,
        instruction: 'Reinstall access panels. Do not operate unit without all panels securely in place',
        est_minutes: null,
        phase: 'Phase IV: Reassembly & Gap Verification',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 45,
        instruction: 'Verify all panels installed and all safety switches engaged',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 46,
        instruction: 'Restore electrical power at breaker/disconnect',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 47,
        instruction: 'Turn manual gas valve to ON position',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 48,
        instruction: 'Perform gas leak check at valve and all connections using approved leak detection solution',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 49,
        instruction: 'Set thermostat to call for heat',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 50,
        instruction: 'Observe startup sequence per timing diagram: Display changes to \'H\', inducer motor pre-purge (30 seconds), ignition spark, flame establishment within 3-5 seconds',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 51,
        instruction: 'Verify flame color: Blue flame indicates proper combustion. Yellow/orange requires investigation',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 52,
        instruction: 'Monitor flame LED: Should be continuously on when flame sensed',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 53,
        instruction: 'Verify blower startup approximately 20 seconds after burner ignition',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 54,
        instruction: 'Allow furnace to operate for minimum 15 minutes to stabilize',
        est_minutes: 15,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 55,
        instruction: 'Measure and record supply air temperature',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 56,
        instruction: 'Measure and record return air temperature',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 57,
        instruction: 'Calculate temperature rise (Supply minus Return)',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 58,
        instruction: 'CRITICAL: Verify temperature rise is within range specified on furnace nameplate',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 59,
        instruction: 'Measure and record manifold gas pressure. Verify matches nameplate specification',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 60,
        instruction: 'Observe complete cycle including flame and blower shutdown',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 61,
        instruction: 'Check condensate drainage (condensing units). Prime trap if necessary with 10 oz water',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 62,
        instruction: 'Document all measurements and observations on service report',
        est_minutes: null,
        phase: 'Phase V: Startup & Commissioning',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 63,
        instruction: 'Perform visual inspection of all accessible components',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 64,
        instruction: 'Verify all panels secured and area clean',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 65,
        instruction: 'Test thermostat operation through complete cycle',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 66,
        instruction: 'Provide customer with service report including all measurements',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 67,
        instruction: 'Explain work performed and findings in clear, professional language',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 68,
        instruction: 'Provide maintenance recommendations based on findings',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 69,
        instruction: 'For standard efficiency units: Recommend burner inspection and cleaning every 2 years',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 70,
        instruction: 'For condensing units: Recommend annual inspection of exhaust/intake systems, condensate trap, and vent connections',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 71,
        instruction: 'Advise customer on filter maintenance schedule',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 72,
        instruction: 'Answer customer questions professionally and thoroughly',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 73,
        instruction: 'Leave manufacturer\'s manual with customer',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 74,
        instruction: 'Tag unit with service date and technician information',
        est_minutes: null,
        phase: 'Phase VI: Final Inspection & Customer Handoff',
        todo_verify: 0
      }
    ]
  }
];
