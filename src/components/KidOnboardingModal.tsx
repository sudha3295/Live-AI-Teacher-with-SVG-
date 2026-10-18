import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Globe,
  GraduationCap,
  Heart,
  ArrowRight,
  Info,
  Languages,
  AlertCircle,
  X,
} from 'lucide-react';
import { AOA_LANGUAGES } from '../utils/languages';
import { UserProfile } from '../types';

interface KidOnboardingModalProps {
  isOpen: boolean;
  userProfile: UserProfile | null;
  onClose: () => void;
  onSave: (preferences: {
    languages: string[];
    primaryLanguage: string;
    targetClass: string;
    childName?: string;
  }) => void;
}

const CLASS_OPTIONS = [
  { id: 'Class 1', title: 'Class 1', age: 'Ages 5–6', desc: 'Alphabet phonics, numbers 1–50, sensory exploration' },
  { id: 'Class 2', title: 'Class 2', age: 'Ages 6–7', desc: 'Simple sentences, nature cycles, addition/subtraction' },
  { id: 'Class 3', title: 'Class 3', age: 'Ages 7–8', desc: 'Story comprehension, plants & animals, multiplication' },
  { id: 'Class 4', title: 'Class 4', age: 'Ages 8–9', desc: 'Science experiments, solar system, regional geography' },
  { id: 'Class 5', title: 'Class 5', age: 'Ages 9–10', desc: 'Critical reasoning, human body systems, problem solving' },
];

export const KidOnboardingModal: React.FC<KidOnboardingModalProps> = ({
  isOpen,
  userProfile,
  onClose,
  onSave,
}) => {
  // English only default for new users (no Tamil default)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    userProfile?.preferences?.languages?.length
      ? userProfile.preferences.languages
      : ['English']
  );

  // No default class selection for new users; user must explicitly choose
  const [selectedClass, setSelectedClass] = useState<string>(
    userProfile?.preferences?.targetClass || ''
  );

  const [childName, setChildName] = useState<string>(
    userProfile?.preferences?.childName || ''
  );

  const [showValidationWarning, setShowValidationWarning] = useState<boolean>(false);

  useEffect(() => {
    if (userProfile?.preferences) {
      if (userProfile.preferences.languages?.length) {
        setSelectedLanguages(userProfile.preferences.languages);
      }
      if (userProfile.preferences.targetClass) {
        setSelectedClass(userProfile.preferences.targetClass);
      }
      if (userProfile.preferences.childName) {
        setChildName(userProfile.preferences.childName);
      }
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const hasLanguage = selectedLanguages.length >= 1;
  const hasClass = selectedClass.trim().length > 0;
  const isFormValid = hasLanguage && hasClass;
  const isEditingExisting = !!userProfile?.onboardingCompleted;

  const toggleLanguage = (langName: string) => {
    if (selectedLanguages.includes(langName)) {
      // Allow deselecting down to 0, validation will guide user
      setSelectedLanguages(selectedLanguages.filter((l) => l !== langName));
    } else {
      setSelectedLanguages([...selectedLanguages, langName]);
    }
  };

  const handleSave = () => {
    if (!isFormValid) {
      setShowValidationWarning(true);
      return;
    }
    onSave({
      languages: selectedLanguages,
      primaryLanguage: selectedLanguages[0] || 'English',
      targetClass: selectedClass,
      childName: childName.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-70 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-neutral-300 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-amber-500 via-indigo-600 to-indigo-700 p-5 sm:p-6 text-white shrink-0 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner shrink-0">
                🐘
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">
                    {isEditingExisting ? 'Edit Child Profile & Languages' : 'Welcome to Truncky AI!'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950">
                    {isEditingExisting ? 'Kid Profile' : 'First-Time Setup'}
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Select your child's speaking language and grade level so Truncky tailors all live lessons.
                </p>
              </div>
            </div>

            {isEditingExisting && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Questions Form */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-neutral-50/40">
          {showValidationWarning && !isFormValid && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Please complete the required selections:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-700">
                  {!hasLanguage && <li>Select at least one language your child speaks.</li>}
                  {!hasClass && <li>Select your child's class/grade level (Class 1 to 5).</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Optional: Child Name */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
            <label className="block text-xs font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              <span>What is your child's name? (Optional)</span>
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g. Maya, Sam, Leo, Ananya"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-neutral-50/50"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Truncky will use this to address your child warmly when starting lessons.
            </p>
          </div>

          {/* Question 1: Languages the kid speaks (Mandatory) */}
          <div
            className={`bg-white p-4 sm:p-5 rounded-xl border shadow-2xs space-y-3 transition-colors ${
              !hasLanguage && showValidationWarning ? 'border-rose-400 bg-rose-50/20' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <label className="block text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-indigo-600" />
                  <span>1. Which language(s) does your child speak?</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    * Required
                  </span>
                </label>
                <p className="text-xs text-neutral-500 mt-0.5">
                  English is selected by default. Click any additional languages your child speaks.
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
                  hasLanguage
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                    : 'text-rose-700 bg-rose-50 border-rose-300'
                }`}
              >
                {selectedLanguages.length} selected
              </span>
            </div>

            {/* Language Selection Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {AOA_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.name);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.name)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 shadow-2xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg leading-none shrink-0">{lang.flag}</span>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate leading-tight">{lang.name}</p>
                        <p className="text-[10px] text-neutral-500 truncate leading-tight font-serif">
                          {lang.nativeName}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-neutral-300 bg-neutral-100'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {!hasLanguage && (
              <p className="text-xs font-bold text-rose-600">
                Please select at least one language so Truncky knows how to converse.
              </p>
            )}

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Multilingual Lock:</strong> Truncky AI will speak and recognize speech <em>only</em> in your selected languages.
              </span>
            </div>
          </div>

          {/* Question 2: Class of the kid (Mandatory - No preselection) */}
          <div
            className={`bg-white p-4 sm:p-5 rounded-xl border shadow-2xs space-y-3 transition-colors ${
              !hasClass && showValidationWarning ? 'border-rose-400 bg-rose-50/20' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <label className="block text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span>2. What class / grade is your kid in?</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    * Required
                  </span>
                </label>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select your child's current grade (Class 1 to 5).
                </p>
              </div>
              {hasClass && (
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  {selectedClass}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              {CLASS_OPTIONS.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls.id);
                      setShowValidationWarning(false);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between items-center ${
                      isSelected
                        ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/20 text-purple-950 shadow-xs'
                        : 'bg-white border-neutral-200 hover:border-purple-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center mb-1.5 transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {cls.id.replace('Class ', '')}
                    </div>
                    <span className="text-xs font-bold block">{cls.title}</span>
                    <span className="text-[10px] text-neutral-500 font-medium">{cls.age}</span>
                  </button>
                );
              })}
            </div>

            {!hasClass && (
              <p className="text-xs font-bold text-rose-600">
                Please select a class (Class 1, 2, 3, 4, or 5).
              </p>
            )}
          </div>

          {/* Configuration Preview Banner */}
          <div className="bg-indigo-950 text-white p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold block">
                Target Configuration
              </span>
              <p className="text-xs font-bold text-white mt-0.5">
                {hasClass ? `Grade: ${selectedClass}` : 'Grade: Not selected yet'} •{' '}
                {hasLanguage ? `Languages: ${selectedLanguages.join(', ')}` : 'Languages: None selected'}
              </p>
            </div>
            {isFormValid ? (
              <span className="text-[11px] bg-emerald-800/80 text-emerald-200 px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Ready to Save
              </span>
            ) : (
              <span className="text-[11px] bg-amber-800/80 text-amber-200 px-2.5 py-1 rounded font-semibold">
                Selection Required
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div>
            {!isFormValid && (
              <span className="text-[11px] text-neutral-500 font-medium">
                * Select at least 1 language & 1 class to proceed
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid}
            className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
              isFormValid
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow cursor-pointer'
                : 'bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{isEditingExisting ? 'Save Preferences' : 'Save & Start Learning with Truncky'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
