
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';

interface ContactTechModalProps {
  onClose: () => void;
}

const ContactTechModal: React.FC<ContactTechModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const tech = {
    name: "Mike Richardson",
    company: "Greenwood Heating & Air",
    email: "support@greenwood-hvac.com",
    phone: "+1 (555) 012-3456",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200"
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(tech.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal onClose={onClose}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brand-black dark:text-white">Contact Technician</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-brand-black dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-800 mb-3 shadow-sm">
                <img src={tech.avatar} alt={tech.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-bold text-brand-black dark:text-white">{tech.name}</h3>
            <p className="text-sm text-primary font-medium">{tech.company}</p>
        </div>

        <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark uppercase font-bold">Email</p>
                        <p className="text-sm font-medium text-brand-black dark:text-white truncate">{tech.email}</p>
                    </div>
                </div>
                <button 
                    onClick={handleCopyEmail}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                >
                    <span className="material-symbols-outlined text-[20px]">{copied ? 'check' : 'content_copy'}</span>
                </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">call</span>
                    </div>
                    <div>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark uppercase font-bold">Phone</p>
                        <p className="text-sm font-medium text-brand-black dark:text-white">{tech.phone}</p>
                    </div>
                </div>
                <a 
                    href={`tel:${tech.phone}`}
                    className="p-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 rounded-lg transition-colors shadow-sm text-brand-black dark:text-white"
                >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
            </div>
        </div>

        <div className="mt-8">
            <button onClick={onClose} className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-brand-black dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Done
            </button>
        </div>
    </Modal>
  );
};

export default ContactTechModal;
