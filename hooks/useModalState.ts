import { useState } from 'react';
import { LootModalData } from '../components/LootModal';
import { MedicalEstablishmentType } from '../types';
import { ReadableEpitaph } from '../components/ReadModal';

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
  const [showReadModal, setShowReadModal] = useState(false);
  const [lootModalData, setLootModalData] = useState<LootModalData | null>(null);
  const [medicalModal, setMedicalModal] = useState<MedicalModalState | null>(null);
  const [readModalData, setReadModalData] = useState<ReadableEpitaph | null>(null);

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
    showReadModal,
    setShowReadModal,
    lootModalData,
    setLootModalData,
    medicalModal,
    setMedicalModal,
    readModalData,
    setReadModalData
  };
};
