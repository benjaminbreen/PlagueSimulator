import { useState } from 'react';
import { LootModalData } from '../components/LootModal';
import { MedicalEstablishmentType } from '../types';

export interface MedicalModalState {
  isOpen: boolean;
  establishmentType: MedicalEstablishmentType;
  practitionerName: string;
}

export const useModalState = () => {
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [lootModalData, setLootModalData] = useState<LootModalData | null>(null);
  const [medicalModal, setMedicalModal] = useState<MedicalModalState | null>(null);

  return {
    showEnterModal,
    setShowEnterModal,
    showMerchantModal,
    setShowMerchantModal,
    showPlayerModal,
    setShowPlayerModal,
    showEncounterModal,
    setShowEncounterModal,
    showGuideModal,
    setShowGuideModal,
    lootModalData,
    setLootModalData,
    medicalModal,
    setMedicalModal
  };
};
