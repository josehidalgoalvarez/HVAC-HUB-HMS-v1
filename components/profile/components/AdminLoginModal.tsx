import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';

import { apiClient } from '../../../src/api/client';

interface AdminLoginModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');

        const useApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_API === 'true');

        if (useApi) {
            try {
                setIsSubmitting(true);
                const email = username.includes('@') ? username : `${username}@hvachome.local`;
                const loginResult = await apiClient.login(email, password);
                if (loginResult && loginResult.token) {
                    // Verify round-trip to GET /api/tickets
                    await apiClient.getTickets();
                    onSuccess();
                    setUsername('');
                    setPassword('');
                    alert(`⚡ Logged in as ${loginResult.user.name} (${loginResult.user.role}) ⚡\n\nToken verified and round-trip /api/tickets succeeded.`);
                    return;
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Login failed';
                setLoginError(msg);
                return;
            } finally {
                setIsSubmitting(false);
            }
        }

        // Offline / v1 local fallback
        if ((username === 'tech1' && password === 'tech1') || (username === 'tech' && password === 'tech')) {
            onSuccess();
            setUsername('');
            setPassword('');
            setLoginError('');
            alert("⚡ Super Powers Activated! ⚡\n\nYou now have full edit access.");
        } else {
            setLoginError('Invalid username or password.');
        }
    };

    return (
        <Modal onClose={onClose} className="max-w-xs" zIndexClass="z-[80]">
            <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-3">
                    <span className="material-symbols-outlined text-[24px]">lock</span>
                </div>
                <h3 className="text-xl font-bold text-brand-black dark:text-white">Admin Access</h3>
                <p className="text-sm text-text-sub-light dark:text-text-sub-dark text-center mt-1">
                    Enter credentials to unlock editing capabilities.
                </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-brand-orange/50"
                        autoFocus
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-brand-orange/50"
                    />
                </div>

                {loginError && (
                    <p className="text-xs text-brand-red font-bold text-center">{loginError}</p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-black dark:bg-white text-white dark:text-brand-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
                >
                    {isSubmitting ? 'Verifying...' : 'Unlock'}
                </button>
            </form>

            <button
                onClick={onClose}
                className="w-full mt-4 text-xs font-bold text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white"
            >
                Cancel
            </button>
        </Modal>
    );
};
