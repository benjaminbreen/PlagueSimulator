/**
 * ClimbableAccessory - Main renderer for climbable accessories
 *
 * Switches between different climbable types based on accessory.type
 */

import React from 'react';
import { ClimbableAccessory as ClimbableAccessoryType } from '../../../types';
import { WoodenLadder } from './WoodenLadder';
import { StoneStaircase } from './StoneStaircase';

interface ClimbableAccessoryProps {
  accessory: ClimbableAccessoryType;
  nightFactor?: number;
}

export const ClimbableAccessory: React.FC<ClimbableAccessoryProps> = ({
  accessory,
  nightFactor = 0,
}) => {
  switch (accessory.type) {
    case 'WOODEN_LADDER':
      return <WoodenLadder accessory={accessory} nightFactor={nightFactor} />;

    case 'STONE_STAIRCASE':
      return <StoneStaircase accessory={accessory} nightFactor={nightFactor} />;

    case 'GRAPE_TRELLIS':
      // TODO: Implement GrapeTrellis component
      return null;

    case 'MASHRABIYA':
      // TODO: Implement MashrabiyaBalcony component
      return null;

    case 'LEAN_TO':
      // TODO: Implement LeanToShade component
      return null;

    default:
      return null;
  }
};

export default ClimbableAccessory;
