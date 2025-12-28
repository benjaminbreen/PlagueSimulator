import React, { useMemo } from 'react';
import { MerchantNPC as MerchantNPCType, MarketStall } from '../types';
import { Humanoid } from './Humanoid';

interface MerchantNPCProps {
  merchant: MerchantNPCType;
  stall?: MarketStall;
  nightFactor: number;
}

export const MerchantNPC: React.FC<MerchantNPCProps> = ({ merchant, stall, nightFactor }) => {
  const { stats, position } = merchant;

  // Extract appearance from stats - use procedurally generated colors
  // Generate skin tone from merchant ID for consistency
  const idSeed = stats.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const tone = (idSeed % 100) / 100;
  // Levantine/Mediterranean skin tones - olive to light brown
  const skinTone = `hsl(${24 + Math.round(tone * 10)}, ${25 + Math.round(tone * 17)}%, ${48 + Math.round(tone * 18)}%)`;
  const robeBaseColor = stats.robeBaseColor ?? '#4a3c2a'; // Brown robe for merchants
  const robeAccentColor = stats.robeAccentColor ?? '#8b7355'; // Lighter brown accent

  // Merchants face outward from stall (toward customers)
  const rotation = useMemo<[number, number, number]>(() => {
    if (!stall) return [0, 0, 0];

    // Rotate merchant to face forward from the stall
    // Stall rotation is in degrees, convert to radians and add π (face outward)
    const rotationRad = (stall.rotation * Math.PI) / 180;
    return [0, rotationRad, 0];
  }, [stall]);

  return (
    <group position={position} rotation={rotation}>
      <Humanoid
        color={robeBaseColor}
        headColor={skinTone}
        gender={stats.gender}
        scale={[stats.height / 1.7, stats.height / 1.7, stats.height / 1.7]}
        isWalking={false}
        isSprinting={false}
        isDead={false}
        robeAccentColor={robeAccentColor}
        robeHasSash={true}
        robeSleeves={true}
        robeHasTrim={stats.robeHasTrim}
        robeHemBand={stats.robeHemBand}
        robeSpread={stats.robeSpread}
        robeOverwrap={stats.robeOverwrap}
        robePattern={stats.robePattern}
        hairStyle={stats.hairStyle}
        headwearStyle={stats.headwearStyle}
        sleeveCoverage={stats.sleeveCoverage}
        footwearStyle={stats.footwearStyle}
        footwearColor={stats.footwearColor}
        accessories={stats.accessories}
        enableArmSwing={false}
        showGroundShadow={true}
      />
    </group>
  );
};
