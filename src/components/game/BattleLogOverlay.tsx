import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatBattleTimestamp,
  type BattleLogEntry,
  type BattleLogTone,
} from '../../game/useBattleLog';

interface BattleLogOverlayProps {
  entries: BattleLogEntry[];
}

const TONE_TEXT_COLOR: Record<BattleLogTone, string> = {
  wave: 'text-[#F6C465]',
  crit: 'text-[#FCA5A5]',
  clash: 'text-[#FAF3E6]',
  giant: 'text-[#FDE68A]',
  castle: 'text-[#FDBA74]',
  evolve: 'text-[#93C5FD]',
  rally: 'text-[#A7F3D0]',
};

const ROW_OPACITY = ['opacity-55', 'opacity-72', 'opacity-88', 'opacity-100'];

export function BattleLogOverlay({ entries }: BattleLogOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleEntries = entries.slice(-4);
  const latestEntry = visibleEntries[visibleEntries.length - 1];

  return (
    <aside
      data-testid="battle-log"
      aria-label="Battle Log"
      aria-live="polite"
      className="self-start w-[238px] max-w-[68%] rounded-xl overflow-hidden transition-opacity duration-200"
      style={{
        backgroundColor: 'rgba(30, 23, 18, 0.8)',
        border: '1.5px solid rgba(233, 186, 88, 0.36)',
        boxShadow: '0 4px 14px rgba(18, 12, 8, 0.34)',
      }}
    >
      {/* Compact Header with Collapse Affordance */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 px-2.5 py-1 border-b border-[#FAF3E6]/12">
        <span className="text-[10px] font-extrabold tracking-wide text-[#E6DAC2]">
          Battle Log
        </span>
        {collapsed && latestEntry && (
          <span
            className={`text-[10px] font-bold truncate flex-1 text-right ${TONE_TEXT_COLOR[latestEntry.tone]}`}
          >
            {latestEntry.label}
          </span>
        )}
        <button
          type="button"
          data-testid="battle-log-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand battle log' : 'Collapse battle log'}
          className="p-0.5 -mr-0.5 rounded text-[#D4C5AE] hover:text-[#FFFDF7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E9BA58] cursor-pointer shrink-0"
        >
          {collapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Rolling Event Feed (Newest at Bottom) */}
      {!collapsed && (
        <ul
          data-testid="battle-log-entries"
          className="pointer-events-none px-2.5 py-1.5 space-y-1"
        >
          {visibleEntries.length === 0 ? (
            <li className="text-[10.5px] font-medium text-[#C8BBA6] leading-tight">
              Standing ready on the valley road...
            </li>
          ) : (
            visibleEntries.map((entry, index) => {
              const opacityIdx = Math.max(
                0,
                ROW_OPACITY.length - (visibleEntries.length - index)
              );
              const isNewest = index === visibleEntries.length - 1;
              return (
                <li
                  key={entry.id}
                  data-testid="battle-log-entry"
                  className={`flex items-baseline gap-1.5 text-[10.5px] leading-snug transition-opacity duration-200 ${ROW_OPACITY[opacityIdx]}`}
                >
                  <span className="font-mono-num tabular-nums text-[9.5px] font-semibold text-[#B9AA95] shrink-0">
                    {formatBattleTimestamp(entry.timeSec)}
                  </span>
                  <div className="min-w-0 truncate">
                    <span
                      className={`${isNewest ? 'font-extrabold' : 'font-bold'} ${
                        TONE_TEXT_COLOR[entry.tone]
                      }`}
                    >
                      {entry.label}
                    </span>
                    {entry.detail && (
                      <span className="text-[#D9CEBC] font-medium">
                        {' · '}
                        {entry.detail}
                      </span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </aside>
  );
}
