import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Service } from '../services';

interface LayoutProps {
    children: ReactNode;
    services: Service[];
    activeService: string;
    onSelectService: (id: string) => void;
    onAddService: () => void;
    onOpenSettings: () => void;
    onRemoveService: (id: string) => void;
    onReorderServices: (startIndex: number, endIndex: number) => void;
}

export default function Layout({
    children,
    services,
    activeService,
    onSelectService,
    onAddService,
    onOpenSettings,
    onRemoveService,
    onReorderServices
}: LayoutProps) {
    const activeServiceData = services.find(s => s.id === activeService);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
            <Sidebar
                services={services}
                activeService={activeService}
                onSelectService={onSelectService}
                onAddService={onAddService}
                onOpenSettings={onOpenSettings}
                onRemoveService={onRemoveService}
                onReorderServices={onReorderServices}
            />
            <main className="flex-1 relative flex flex-col min-w-0">
                {/* Service Header - Always visible to provide controls */}
                {activeServiceData && (
                    <div className="h-10 bg-gray-800 border-b border-white/10 flex items-center justify-between px-4 select-none draggable-region">
                        <div className="flex items-center space-x-2">
                            <activeServiceData.icon className={`w-5 h-5 ${activeServiceData.color}`} />
                            <span className="font-medium text-sm">{activeServiceData.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => onRemoveService(activeService)}
                                className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
                                title="Close Service"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex-1 relative">
                    {children}
                </div>
            </main>
        </div>
    );
}
