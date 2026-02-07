
import React, { useState } from 'react';
import { Property, ChangeLogEntry } from '../../types';
import { generateICSContent } from './icsGenerator';
import { Modal } from '../ui/Modal';

interface ScheduleServiceModalProps {
  property: Property;
  onClose: () => void;
  onLog?: (
    action: ChangeLogEntry['action'],
    entityType: ChangeLogEntry['entityType'],
    entityId: string,
    entityName: string,
    details: string,
    propertyId?: string
  ) => void;
}

const ScheduleServiceModal: React.FC<ScheduleServiceModalProps> = ({ property, onClose, onLog }) => {
  const [title, setTitle] = useState('Routine Appliance Maintenance');

  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getTomorrow());
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const technician = {
    name: "Jose Hidalgo",
    email: "josehidalgo@hivemindinc.solutions"
  };

  const logRequest = (type: string) => {
    if (onLog) {
      onLog(
        'SERVICE_REQUEST',
        'PROPERTY',
        property.id,
        property.name,
        `Requested service via ${type}. Date: ${date} ${time}. Notes: ${notes.substring(0, 30)}...`,
        property.id
      );
    }
  };

  const getStartEndTimes = () => {
    if (!date || !time) return null;
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end };
  };

  const generateGoogleCalendarLink = () => {
    const times = getStartEndTimes();
    if (!times) return '#';

    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const details = encodeURIComponent(`Service for property: ${property.name}\nAddress: ${property.address}\n\nTechnician: ${technician.name} (${technician.email})\nNotes: ${notes}`);
    const text = encodeURIComponent(title);
    const location = encodeURIComponent(property.address);
    const dates = `${formatTime(times.start)}/${formatTime(times.end)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&add=${technician.email}`;
  };

  const handleGoogleCalClick = () => {
    logRequest('Google Calendar');
    if (isValid) setTimeout(onClose, 1000);
  };

  const downloadICS = () => {
    try {
      const times = getStartEndTimes();
      if (!times) {
        alert("Please select a date and time.");
        return;
      }

      const icsContent = generateICSContent({
        title,
        description: `Service Request for ${property.name}\nAddress: ${property.address}\nNotes: ${notes}`,
        location: property.address,
        start: times.start,
        end: times.end,
        attendeeName: technician.name,
        attendeeEmail: technician.email,
        organizerName: "HVACHome User",
        organizerEmail: "josehidalgo@hivemindinc.solutions"
      });

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `service-request-${date}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logRequest('ICS Invite');
    } catch (e) {
      console.error("Failed to generate ICS:", e);
      alert("Failed to generate calendar file.");
    }
  };

  const sendEmailRequest = () => {
    const times = getStartEndTimes();
    if (!times) return;

    const subject = encodeURIComponent(`Service Request: ${title} - ${property.address}`);
    const body = encodeURIComponent(`Hi ${technician.name},\n\nI would like to request service for the following property:\n\nProperty: ${property.name}\nAddress: ${property.address}\n\nRequested Date: ${date}\nRequested Time: ${time}\n\nIssue/Notes: ${notes}\n\nPlease confirm if this time works for you.\n\nSent via HVACHome`);

    logRequest('Email');

    window.location.href = `mailto:${technician.email}?subject=${subject}&body=${body}`;
  };

  const isValid = !!date && !!time;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-brand-black dark:text-white">Schedule Service</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-brand-black dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 shadow-sm">
            <span className="material-symbols-outlined">engineering</span>
          </div>
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Technician</p>
            <p className="text-sm font-bold text-brand-black dark:text-white">{technician.name}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Service Type</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-[#1a9387]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-[#1a9387]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-[#1a9387]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe issues or specific instructions..."
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none resize-none focus:ring-2 focus:ring-[#1a9387]"
          ></textarea>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={sendEmailRequest}
            disabled={!isValid}
            className="flex items-center justify-center gap-2 w-full bg-[#1a9387] hover:bg-[#157a70] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">send</span>
            Email Service Request
          </button>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={generateGoogleCalendarLink()}
              target="_blank"
              rel="noreferrer"
              onClick={handleGoogleCalClick}
              className={`flex items-center justify-center gap-2 w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-brand-black dark:text-white font-bold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98] ${!isValid ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-5 h-5" alt="Google" />
              Google Cal
            </a>

            <button
              onClick={downloadICS}
              disabled={!isValid}
              className="flex items-center justify-center gap-2 w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-brand-black dark:text-white font-bold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">download</span>
              .ics Invite
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleServiceModal;
