import { X } from 'lucide-react';
import { Service, availableServices } from '../services';

interface ServiceSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (service: Service) => void;
}

export default function ServiceSelector({ isOpen, onClose, onSelect }: ServiceSelectorProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Add Service</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {availableServices.map((service) => {
                        const Icon = service.icon;
                        return (
                            <button
                                key={service.id}
                                onClick={() => onSelect(service)}
                                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                            >
                                <Icon className={`w-8 h-8 mb-2 text-white group-hover:scale-110 transition-transform`} />
                                <span className="text-sm font-medium text-gray-300">{service.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
