
export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DUPLICATE' | 'SERVICE_REQUEST' | 'MAINTENANCE_RECORD' | 'IMPORT';
  entityType: 'PROPERTY' | 'APPLIANCE';
  entityName: string;
  entityId: string;
  propertyId?: string;
  details: string;
}
