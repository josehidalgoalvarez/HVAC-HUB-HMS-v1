
import React, { useState, useEffect } from 'react';
import { ViewType } from './types';
import { useTheme } from './hooks/useTheme';
import { DataProvider, ActionContext, InventoryContext } from './context/DataContext';
import LayoutWrapper from './components/layout/LayoutWrapper';
import Router from './components/Router';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { TUTORIAL_STEPS } from './tutorial';

// Helper to get session data safely
const getSession = <T,>(key: string, fallback: T): T => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

// Inner component to consume context
const AppContent: React.FC = () => {
  // Initialize state from Session Storage to prevent context loss on refresh
  const [activeView, setActiveView] = useState<ViewType>(() =>
    getSession('pt_activeView', ViewType.PROPERTIES)
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() =>
    getSession('pt_selectedPropertyId', null)
  );
  const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(() =>
    getSession('pt_selectedApplianceId', null)
  );
  const [isEditMode, setIsEditMode] = useState(() =>
    getSession('pt_isEditMode', false)
  );
  const [previousView, setPreviousView] = useState<ViewType | null>(() =>
    getSession('pt_previousView', null)
  );

  const { isDarkMode, toggleDarkMode } = useTheme();

  // Persist State Changes to Session Storage
  useEffect(() => { sessionStorage.setItem('pt_activeView', JSON.stringify(activeView)); }, [activeView]);
  useEffect(() => { sessionStorage.setItem('pt_selectedPropertyId', JSON.stringify(selectedPropertyId)); }, [selectedPropertyId]);
  useEffect(() => { sessionStorage.setItem('pt_selectedApplianceId', JSON.stringify(selectedApplianceId)); }, [selectedApplianceId]);
  useEffect(() => { sessionStorage.setItem('pt_isEditMode', JSON.stringify(isEditMode)); }, [isEditMode]);
  useEffect(() => { sessionStorage.setItem('pt_previousView', JSON.stringify(previousView)); }, [previousView]);

  // --- Tutorial State ---
  const { isTutorialActive, tutorialStep } = React.useContext(InventoryContext)!;
  const { endTutorial, setTutorialStep } = React.useContext(ActionContext)!;

  // Helper to handle tutorial navigation
  const navigateToStep = (stepIndex: number) => {
    const step = TUTORIAL_STEPS[stepIndex];
    if (step && step.view) {
      setActiveView(step.view);
    }
  };

  // Execute navigation when step changes
  useEffect(() => {
    if (isTutorialActive) {
      navigateToStep(tutorialStep);
    }
  }, [tutorialStep, isTutorialActive]);

  const handleNextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      endTutorial();
    }
  };

  const handlePrevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      <LayoutWrapper
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          window.scrollTo(0, 0);
        }}
      >
        <Router
          activeView={activeView}
          selectedPropertyId={selectedPropertyId}
          selectedApplianceId={selectedApplianceId}
          isEditMode={isEditMode}
          setActiveView={setActiveView}
          setPreviousView={setPreviousView}
          setSelectedPropertyId={setSelectedPropertyId}
          setSelectedApplianceId={setSelectedApplianceId}
          setIsEditMode={setIsEditMode}
          previousView={previousView}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
        />
      </LayoutWrapper>

      {isTutorialActive && (
        <TutorialOverlay
          step={TUTORIAL_STEPS[tutorialStep]}
          stepIndex={tutorialStep}
          totalSteps={TUTORIAL_STEPS.length}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
          onExit={endTutorial}
        />
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
