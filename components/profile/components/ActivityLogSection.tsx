import React from 'react';
import { ChangeLogEntry } from '../../../types';

interface ActivityLogSectionProps {
    logs: ChangeLogEntry[];
}

export const ActivityLogSection: React.FC<ActivityLogSectionProps> = ({ logs }) => {
    return (
        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-ethereal border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                <h3 className="font-bold text-brand-black dark:text-white">Recent Activity</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
                {logs.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.action === 'DELETE' ? 'bg-brand-red' :
                                        log.action === 'CREATE' ? 'bg-green-500' :
                                            log.action === 'SERVICE_REQUEST' ? 'bg-brand-orange' : 'bg-primary'
                                    }`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">
                                            {log.action.replace('_', ' ')}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-brand-black dark:text-white truncate">{log.entityName}</p>
                                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">{log.details}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">User: {log.user}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-text-sub-light dark:text-text-sub-dark italic text-sm">
                        No recent activity recorded.
                    </div>
                )}
            </div>
        </div>
    );
};
