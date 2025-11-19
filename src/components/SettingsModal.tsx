import { X, Monitor, Layout, User, Plus, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'windowed' | 'embedded';
    onViewModeChange: (mode: 'windowed' | 'embedded') => void;
    currentProfile: string;
    profiles: string[];
    onSwitchProfile: (name: string) => void;
    onCreateProfile: (name: string) => void;
    onDeleteProfile: (name: string) => void;
}

export default function SettingsModal({
    isOpen,
    onClose,
    viewMode,
    onViewModeChange,
    currentProfile,
    profiles,
    onSwitchProfile,
    onCreateProfile,
    onDeleteProfile
}: SettingsModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");

    if (!isOpen) return null;

    const handleCreate = () => {
        if (newProfileName.trim()) {
            onCreateProfile(newProfileName.trim());
            setNewProfileName("");
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-96 flex flex-col max-h-[90vh] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto">
                    {/* Profile Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Profiles</h3>

                        {!isCreating ? (
                            <div className="space-y-2">
                                <div className="bg-white/5 rounded-xl p-2 space-y-1">
                                    {profiles.map(profile => (
                                        <div key={profile} className="flex items-center space-x-2">
                                            <button
                                                onClick={() => onSwitchProfile(profile)}
                                                className={`flex-1 flex items-center justify-between p-3 rounded-lg transition-colors ${currentProfile === profile
                                                        ? 'bg-indigo-600/20 text-white'
                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <User size={18} />
                                                    <span className="font-medium">{profile}</span>
                                                </div>
                                                {currentProfile === profile && <Check size={16} className="text-indigo-400" />}
                                            </button>
                                            {profile !== "Default" && (
                                                <button
                                                    onClick={() => onDeleteProfile(profile)}
                                                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                                                    title="Delete Profile"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-all"
                                >
                                    <Plus size={16} />
                                    <span className="text-sm">Create New Profile</span>
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white/5 rounded-xl p-3 space-y-3">
                                <p className="text-sm text-white font-medium">New Profile Name</p>
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Work, Personal"
                                    autoFocus
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newProfileName.trim()}
                                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View Mode Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">View Mode</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onViewModeChange('embedded')}
                                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${viewMode === 'embedded'
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <Layout size={24} className="mb-2" />
                                <span className="text-sm font-medium">Embedded</span>
                            </button>
                            <button
                                onClick={() => onViewModeChange('windowed')}
                                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${viewMode === 'windowed'
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <Monitor size={24} className="mb-2" />
                                <span className="text-sm font-medium">Windowed</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {viewMode === 'embedded'
                                ? "Services appear as tabs within the main window."
                                : "Services open as separate floating windows."}
                        </p>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <a
                        href="https://github.com/Vaixtrom/MultiSocials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors no-underline"
                    >
                        Made by Vaixtrom on GitHub
                    </a>
                </div>
            </div>
        </div>
    );
}
