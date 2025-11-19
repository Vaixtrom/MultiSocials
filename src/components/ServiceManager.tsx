import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Service } from '../services';

interface ServiceManagerProps {
    services: Service[];
    activeService: string;
    viewMode: 'windowed' | 'embedded';
    isSettingsOpen: boolean;
    isSelectorOpen: boolean;
}

export default function ServiceManager({ services, activeService, viewMode, isSettingsOpen, isSelectorOpen }: ServiceManagerProps) {
    const createdViews = useRef<Set<string>>(new Set());
    const previousActiveService = useRef<string>('');
    const previousViewMode = useRef<'windowed' | 'embedded'>(viewMode);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        const updateBounds = async (serviceId: string) => {
            const size = await appWindow.innerSize();
            const factor = await appWindow.scaleFactor();
            const sidebarWidth = Math.round(80 * factor);
            const headerHeight = Math.round(40 * factor); // 40px header
            const contentWidth = size.width - sidebarWidth;
            const contentHeight = size.height - headerHeight;

            await invoke('update_service_view_bounds', {
                id: serviceId,
                x: sidebarWidth,
                y: headerHeight,
                width: contentWidth,
                height: contentHeight
            });
        };

        const manageViews = async () => {
            const service = services.find(s => s.id === activeService);
            if (!service) return;

            // Always try to create the view - Rust side will skip if it already exists
            // This ensures that manually closed windows can be reopened
            const size = await appWindow.innerSize();
            const factor = await appWindow.scaleFactor();
            const sidebarWidth = Math.round(80 * factor);
            const headerHeight = Math.round(40 * factor);
            const contentWidth = size.width - sidebarWidth;
            const contentHeight = size.height - headerHeight;

            try {
                await invoke('create_service_view', {
                    id: service.id,
                    url: service.url,
                    x: sidebarWidth,
                    y: headerHeight,
                    width: contentWidth,
                    height: contentHeight,
                    embedded: viewMode === 'embedded'
                });

                createdViews.current.add(service.id);

                // In windowed mode, only show when:
                // 1. Active service changed (user clicked a different sidebar icon)
                // 2. NOT when other state changed (settings open, etc)
                const activeServiceChanged = previousActiveService.current !== service.id;
                if (viewMode === 'windowed' && activeServiceChanged) {
                    try {
                        await invoke('show_service_view', { id: service.id });
                        previousActiveService.current = service.id;
                    } catch (e) {
                        // Window might not exist if it was manually closed, that's ok
                        console.log(`Could not show window for ${service.id}, might have been closed`);
                    }
                }
            } catch (e) {
                console.error("Failed to create service view:", e);
            }

            // Only update mode when viewMode actually changes, not on every render
            const viewModeChanged = previousViewMode.current !== viewMode;
            if (viewModeChanged) {
                previousViewMode.current = viewMode;

                // Update mode for all created views
                for (const s of services) {
                    if (createdViews.current.has(s.id)) {
                        try {
                            await invoke('update_service_view_mode', {
                                id: s.id,
                                embedded: viewMode === 'embedded'
                            });
                        } catch (e) {
                            console.error(`Failed to update view mode for ${s.id}:`, e);
                        }
                    }
                }

                // When switching TO windowed mode, create and show ALL service windows
                if (viewMode === 'windowed') {
                    for (const s of services) {
                        // Create the window if it doesn't exist
                        try {
                            await invoke('create_service_view', {
                                id: s.id,
                                url: s.url,
                                x: sidebarWidth,
                                y: headerHeight,
                                width: contentWidth,
                                height: contentHeight,
                                embedded: false
                            });
                            createdViews.current.add(s.id);
                        } catch (e) {
                            console.error(`Failed to create window for ${s.id}:`, e);
                        }

                        // Show the window
                        try {
                            await invoke('show_service_view', { id: s.id });
                        } catch (e) {
                            console.log(`Could not show window for ${s.id}`);
                        }
                    }
                }
            }

            // Only manage show/hide in embedded mode
            // In windowed mode, let the windows stay independent
            if (viewMode === 'embedded') {
                for (const s of services) {
                    if (createdViews.current.has(s.id)) {
                        if (s.id === activeService) {
                            // If settings or selector are open, hide the view
                            if (isSettingsOpen || isSelectorOpen) {
                                await invoke('hide_service_view', { id: s.id });
                            } else {
                                await invoke('show_service_view', { id: s.id });
                                await updateBounds(s.id);
                            }
                        } else {
                            // Hide non-active services
                            await invoke('hide_service_view', { id: s.id });
                        }
                    }
                }
            }
        };

        manageViews();

        const unlistenResize = appWindow.onResized(async () => {
            if (activeService && createdViews.current.has(activeService) && viewMode === 'embedded') {
                await updateBounds(activeService);
            }
        });

        return () => {
            unlistenResize.then(f => f());
        };

    }, [activeService, services, viewMode, isSettingsOpen, isSelectorOpen]);

    return (
        <div className="flex-1 h-full flex items-center justify-center text-gray-500 bg-gray-900">
            <p>Loading {activeService}...</p>
        </div>
    );
}
