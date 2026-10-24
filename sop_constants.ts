import { SOP } from './types/domain';

export const SEED_SOPS: SOP[] = [
  {
    id: 'sop-gas-furnace-service',
    title: 'Gas furnace service (CSA B149.1-25 / TSSA)',
    category: 'Gas / HVAC',
    version: 1,
    required_tools: [],
    required_parts: [],
    access_requirements: [],
    compliance_gates: [
      {
        id: 'csa-b149-1-25',
        label: 'CSA B149.1-25',
        reference: 'CSA B149.1-25 (natural gas and propane installation code)',
        requirement: 'TODO-verify: applicable clauses not yet provided'
      },
      {
        id: 'tssa-gas',
        label: 'TSSA',
        reference: 'TSSA (Technical Standards and Safety Authority, Ontario)',
        requirement: 'TODO-verify: applicable requirements not yet provided'
      }
    ],
    weather_exposure: null,
    two_person: null,
    todo_verify: 1,
    source_note: 'SHELL - no gas-furnace SOP content existed in the repo. Steps, tools, parts, access, weather and two-person flag are TODO-verify until Jose supplies the procedure.',
    steps: [
      {
        sop_id: 'sop-gas-furnace-service',
        position: 1,
        instruction: 'TODO-verify: step 1 not yet provided',
        est_minutes: null,
        todo_verify: 1
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 2,
        instruction: 'TODO-verify: step 2 not yet provided',
        est_minutes: null,
        todo_verify: 1
      },
      {
        sop_id: 'sop-gas-furnace-service',
        position: 3,
        instruction: 'TODO-verify: step 3 not yet provided',
        est_minutes: null,
        todo_verify: 1
      }
    ]
  }
];
