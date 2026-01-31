
import React, { useState } from 'react';
import { MaintenanceRecord } from '../../../../types';
import { Modal } from '../../../ui/Modal';

interface AddMaintenanceRecordFormProps {
  onSave: (record: MaintenanceRecord) => void;
  onClose: () => void;
}

export const AddMaintenanceRecordForm: React.FC<AddMaintenanceRecordFormProps> = ({ onSave, onClose }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('Routine Maintenance');
    const [notes, setNotes] = useState('');
    const [technician, setTechnician] = useState('Self');

    const handleSubmit = () => {
        onSave({
            date: new Date(date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}), 
            type, 
            notes, 
            technician
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-xl font-bold text-brand-black dark:text-white mb-4">Add Maintenance Record</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Service Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none">
                        <option>Routine Maintenance</option>
                        <option>Repair</option>
                        <option>Inspection</option>
                        <option>Installation</option>
                        <option>Cleaning</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Technician</label>
                    <input type="text" value={technician} onChange={e => setTechnician(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none h-24 resize-none"></textarea>
                </div>
                <button onClick={handleSubmit} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">Save Record</button>
            </div>
        </Modal>
    );
}
