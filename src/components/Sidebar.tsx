import { Plus, Settings, X } from 'lucide-react';
import { Service } from '../services';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, closestCenter, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

interface SidebarProps {
    services: Service[];
    activeService: string;
    onSelectService: (id: string) => void;
    onAddService: () => void;
    onOpenSettings: () => void;
    onRemoveService: (id: string) => void;
    onReorderServices: (startIndex: number, endIndex: number) => void;
}

interface SortableServiceItemProps {
    service: Service;
    isActive: boolean;
    onSelectService: (id: string) => void;
    onRemoveService: (id: string) => void;
}

function SortableServiceItem({ service, isActive, onSelectService, onRemoveService }: SortableServiceItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });

    const Icon = service.icon;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group"
            {...attributes}
            {...listeners}
        >
            <button
                onClick={() => onSelectService(service.id)}
                className={`
                    p-3 rounded-xl transition-all duration-300 relative cursor-grab active:cursor-grabbing
                    ${isActive ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}
                    ${isDragging ? 'shadow-2xl scale-105' : ''}
                `}
                title={service.name}
            >
                <Icon
                    className={`w-8 h-8 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                    style={{ color: service.color }}
                />
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full -ml-4" />
                )}
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemoveService(service.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                title="Remove Service"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <X size={10} />
            </button>
        </div>
    );
}

export default function Sidebar({ services, activeService, onSelectService, onAddService, onOpenSettings, onRemoveService, onReorderServices }: SidebarProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = services.findIndex(s => s.id === active.id);
        const newIndex = services.findIndex(s => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            onReorderServices(oldIndex, newIndex);
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const activeServiceItem = activeId ? services.find(s => s.id === activeId) : null;
    const ActiveIcon = activeServiceItem?.icon;

    return (
        <div className="w-20 h-screen bg-gray-900/90 backdrop-blur-md flex flex-col items-center py-6 border-r border-white/10">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
                <div className="flex-1 w-full flex flex-col items-center space-y-4 overflow-y-auto no-scrollbar pt-2">
                    <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {services.map((service) => (
                            <SortableServiceItem
                                key={service.id}
                                service={service}
                                isActive={activeService === service.id}
                                onSelectService={onSelectService}
                                onRemoveService={onRemoveService}
                            />
                        ))}
                    </SortableContext>

                    <button
                        onClick={onAddService}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                        title="Add Service"
                    >
                        <Plus className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeServiceItem && ActiveIcon ? (
                        <div className="p-3 rounded-xl bg-white/15 shadow-2xl backdrop-blur-sm scale-110 cursor-grabbing">
                            <ActiveIcon
                                className="w-8 h-8"
                                style={{ color: activeServiceItem.color }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <div className="pt-4 border-t border-white/10 w-full flex justify-center">
                <button
                    onClick={onOpenSettings}
                    className="p-3 rounded-xl hover:bg-white/5 transition-all duration-300 group"
                    title="Settings"
                >
                    <Settings className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                </button>
            </div>
        </div>
    );
}
