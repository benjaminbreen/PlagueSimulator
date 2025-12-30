import React from 'react';
import { HangingCarpet } from '../../utils/hangingCarpets';
import { LaundryLine } from '../../utils/laundry';
import { PushableObject } from '../../utils/pushables';
import { HangingCarpets } from './decorations/HangingCarpets';
import { LaundryLines } from './decorations/LaundryLines';
import { PushableBoulder } from './decorations/Boulder';
import {
  PushableBench,
  PushableClayJar,
  PushableBasket,
  PushableCoin,
  PushableOlive,
  PushableLemon,
  PushablePotteryShard,
  PushableLinenScrap,
  PushableCandleStub,
  PushableTwine,
  PushableCrate,
  PushableAmphora,
  PushableDroppedItem,
  PushableStorageChest
} from './decorations/Pushables';
import {
  PushableGeraniumPot,
  PushableOlivePot,
  PushableLemonPot,
  PushablePalmPot,
  PushableBougainvilleaPot
} from './decorations/Pots';

type EnvironmentDecorProps = {
  pushables: PushableObject[];
  laundryLines: LaundryLine[];
  hangingCarpets: HangingCarpet[];
  time: number;
};

const PushableDecorations: React.FC<{ items: PushableObject[] }> = ({ items }) => (
  <>
    {items.map((item) => {
      if (item.kind === 'boulder') return <PushableBoulder key={item.id} item={item} />;
      if (item.kind === 'bench') return <PushableBench key={item.id} item={item} />;
      if (item.kind === 'clayJar') return <PushableClayJar key={item.id} item={item} />;
      if (item.kind === 'geranium') return <PushableGeraniumPot key={item.id} item={item} />;
      if (item.kind === 'basket') return <PushableBasket key={item.id} item={item} />;
      if (item.kind === 'olivePot') return <PushableOlivePot key={item.id} item={item} />;
      if (item.kind === 'lemonPot') return <PushableLemonPot key={item.id} item={item} />;
      if (item.kind === 'palmPot') return <PushablePalmPot key={item.id} item={item} />;
      if (item.kind === 'bougainvilleaPot') return <PushableBougainvilleaPot key={item.id} item={item} />;
      if (item.kind === 'coin') return <PushableCoin key={item.id} item={item} />;
      if (item.kind === 'olive') return <PushableOlive key={item.id} item={item} />;
      if (item.kind === 'lemon') return <PushableLemon key={item.id} item={item} />;
      if (item.kind === 'potteryShard') return <PushablePotteryShard key={item.id} item={item} />;
      if (item.kind === 'linenScrap') return <PushableLinenScrap key={item.id} item={item} />;
      if (item.kind === 'candleStub') return <PushableCandleStub key={item.id} item={item} />;
      if (item.kind === 'twine') return <PushableTwine key={item.id} item={item} />;
      if (item.kind === 'crate') return <PushableCrate key={item.id} item={item} />;
      if (item.kind === 'amphora') return <PushableAmphora key={item.id} item={item} />;
      if (item.kind === 'storageChest') return <PushableStorageChest key={item.id} item={item} />;
      if (item.kind === 'droppedItem') return <PushableDroppedItem key={item.id} item={item} />;
      return null;
    })}
  </>
);

export const EnvironmentDecor: React.FC<EnvironmentDecorProps> = ({ pushables, laundryLines, hangingCarpets, time }) => (
  <>
    {pushables.length > 0 && <PushableDecorations items={pushables} />}
    {laundryLines.length > 0 && <LaundryLines lines={laundryLines} time={time} />}
    {hangingCarpets.length > 0 && <HangingCarpets carpets={hangingCarpets} />}
  </>
);
