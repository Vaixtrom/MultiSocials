
import { useState, useEffect, useRef } from "react";
import Layout from "./components/Layout";
import ServiceManager from "./components/ServiceManager";
import ServiceSelector from "./components/ServiceSelector";
import SettingsModal from "./components/SettingsModal";
import { Service, availableServices } from "./services";
import "./App.css";
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';

interface StoreData {
  currentProfile: string;
  profiles: Record<string, Service[]>;
}

function App() {
  const [activeServiceId, setActiveServiceId] = useState<string>("");
  const [addedServices, setAddedServices] = useState<Service[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'windowed' | 'embedded'>('embedded');
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentProfile, setCurrentProfile] = useState<string>("Default");
  const [profiles, setProfiles] = useState<Record<string, Service[]>>({ "Default": [] });

  const store = useRef<Store | null>(null);

  // Load data from store on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedStore = await Store.load('store.bin');
        store.current = loadedStore;

        const savedData = await loadedStore.get<StoreData>('app_data');

        if (savedData) {
          setCurrentProfile(savedData.currentProfile);

          // Restore icons for all profiles
          const restoredProfiles: Record<string, Service[]> = {};
          Object.entries(savedData.profiles).forEach(([name, services]) => {
            restoredProfiles[name] = services.map((s: Service) => {
              const template = availableServices.find(as => as.url === s.url) || availableServices[0];
              return { ...s, icon: template.icon };
            });
          });
          setProfiles(restoredProfiles);

          const currentServices = restoredProfiles[savedData.currentProfile] || [];
          setAddedServices(currentServices);
          if (currentServices.length > 0) {
            setActiveServiceId(currentServices[0].id);
          }
        } else {
          // Migration or first run: check for old 'services' key
          const oldServices = await loadedStore.get<Service[]>('services');
          if (oldServices) {
            const restoredServices = oldServices.map((s: Service) => {
              const template = availableServices.find(as => as.url === s.url) || availableServices[0];
              return { ...s, icon: template.icon };
            });
            setProfiles({ "Default": restoredServices });
            setAddedServices(restoredServices);
            if (restoredServices.length > 0) setActiveServiceId(restoredServices[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save data whenever profiles or currentProfile changes
  useEffect(() => {
    if (!isLoaded || !store.current) return;
    const saveData = async () => {
      try {
        // Update the current profile in the profiles map before saving
        const updatedProfiles = { ...profiles, [currentProfile]: addedServices };

        // Strip icons
        const profilesToSave: Record<string, any[]> = {};
        Object.entries(updatedProfiles).forEach(([name, services]) => {
          profilesToSave[name] = services.map(({ icon, ...rest }) => rest);
        });

        const dataToSave: StoreData = {
          currentProfile,
          profiles: profilesToSave as Record<string, Service[]>
        };

        await store.current?.set('app_data', dataToSave);
        await store.current?.save();
      } catch (e) {
        console.error("Failed to save data:", e);
      }
    };
    saveData();
  }, [addedServices, currentProfile, isLoaded]); // Note: profiles state is not strictly needed here as we use addedServices for the current one

  const handleAddService = (serviceTemplate: Service) => {
    const newService: Service = {
      ...serviceTemplate,
      id: `${serviceTemplate.id}-${Date.now()}`,
      name: `${serviceTemplate.name} ${addedServices.filter(s => s.url === serviceTemplate.url).length + 1}`
    };

    const newServices = [...addedServices, newService];
    setAddedServices(newServices);
    setProfiles(prev => ({ ...prev, [currentProfile]: newServices }));
    setActiveServiceId(newService.id);
    setIsSelectorOpen(false);
  };

  const handleRemoveService = async (id: string) => {
    try {
      await invoke('close_service_view', { id });
    } catch (e) {
      console.error("Failed to close service view:", e);
    }

    const newServices = addedServices.filter(s => s.id !== id);
    setAddedServices(newServices);
    setProfiles(prev => ({ ...prev, [currentProfile]: newServices }));

    if (activeServiceId === id) {
      setActiveServiceId(newServices.length > 0 ? newServices[0].id : "");
    }
  };

  const handleSwitchProfile = async (profileName: string) => {
    if (profileName === currentProfile) return;

    // Close all current services
    for (const service of addedServices) {
      try {
        await invoke('close_service_view', { id: service.id });
      } catch (e) { console.error(e); }
    }

    setCurrentProfile(profileName);
    const newProfileServices = profiles[profileName] || [];
    setAddedServices(newProfileServices);
    if (newProfileServices.length > 0) {
      setActiveServiceId(newProfileServices[0].id);
    } else {
      setActiveServiceId("");
    }
  };

  const handleCreateProfile = (profileName: string) => {
    if (profiles[profileName]) return; // Already exists
    setProfiles(prev => ({ ...prev, [profileName]: [] }));
    handleSwitchProfile(profileName);
  };

  const handleDeleteProfile = async (profileName: string) => {
    if (profileName === "Default") return; // Cannot delete default

    const newProfiles = { ...profiles };
    delete newProfiles[profileName];
    setProfiles(newProfiles);

    if (currentProfile === profileName) {
      await handleSwitchProfile("Default");
    }
  };

  const handleReorderServices = (startIndex: number, endIndex: number) => {
    const result = Array.from(addedServices);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    setAddedServices(result);
    setProfiles(prev => ({ ...prev, [currentProfile]: result }));
  };

  if (!isLoaded) return (
    <div className="flex-1 h-full flex items-center justify-center text-gray-500 bg-gray-900">
      <p>Loading Profile...</p>
    </div>
  );

  return (
    <>
      <Layout
        services={addedServices}
        activeService={activeServiceId}
        onSelectService={setActiveServiceId}
        onAddService={() => setIsSelectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRemoveService={handleRemoveService}
        onReorderServices={handleReorderServices}
      >
        {addedServices.length === 0 ? (
          <div className="flex-1 h-full flex flex-col items-center justify-center text-gray-400 bg-gray-900">
            <p className="mb-4">No services in <strong>{currentProfile}</strong> profile.</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsSelectorOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Add Service
              </button>
            </div>
          </div>
        ) : (
          <ServiceManager
            services={addedServices}
            activeService={activeServiceId}
            viewMode={viewMode}
            isSettingsOpen={isSettingsOpen}
            isSelectorOpen={isSelectorOpen}
          />
        )}
      </Layout>

      <ServiceSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={handleAddService}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentProfile={currentProfile}
        profiles={Object.keys(profiles)}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
      />
    </>
  );
}

export default App;
