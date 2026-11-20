/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { InkfolkGame } from './components/game/InkfolkGame';
import { StyleSwitcherShell } from './components/pitch/StyleSwitcherShell';

export default function App() {
  const [viewMode, setViewMode] = useState<'game' | 'pitch'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('pitch') === '1') return 'pitch';
    }
    return 'game';
  });

  if (viewMode === 'pitch') {
    return <StyleSwitcherShell onBackToGame={() => setViewMode('game')} />;
  }

  return <InkfolkGame onOpenArtPitch={() => setViewMode('pitch')} />;
}
