"use client";

import { useGamification } from "@/hooks/useGamification";
import { getLevelInfo, LEVELS } from "@/lib/levels";
import { useState } from "react";

export default function GamificationProfile({ isDarkMode }: { isDarkMode?: boolean }) {
  const { stats } = useGamification();
  const levelInfo = getLevelInfo(stats.xp);
  
  const currentLevelIndex = LEVELS.findIndex(l => l.title === levelInfo.title);
  const nextLevel = currentLevelIndex < LEVELS.length - 1 ? LEVELS[currentLevelIndex + 1] : null;
  
  const xpForCurrent = currentLevelIndex > 0 ? LEVELS[currentLevelIndex].xpReq : 0;
  const xpForNext = nextLevel ? nextLevel.xpReq : stats.xp;
  
  const progressPercent = nextLevel 
    ? Math.max(0, Math.min(100, ((stats.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100))
    : 100;

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${isDarkMode ? 'bg-[#111B21]' : 'bg-[#f0f2f5]'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-[#202C33]' : 'bg-[#008069]'} text-white px-4 py-6 shadow-md rounded-b-[2rem] flex flex-col items-center`}>
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center text-5xl mb-3 shadow-inner">
          {levelInfo.icon}
        </div>
        <h2 className="text-2xl font-bold mb-1">{levelInfo.title}</h2>
        <div className={`flex items-center gap-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-emerald-100'}`}>
          <span className="bg-black/20 px-3 py-1 rounded-full text-sm">
            {stats.xp} XP totali
          </span>
          <span className="bg-black/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <span className="text-orange-300">🔥</span> {stats.streak} giorni
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        
        {/* Progresso Livello */}
        <div className={`rounded-2xl p-4 shadow-sm border ${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className={`font-bold text-[15px] ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Prossimo Livello</h3>
              {nextLevel ? (
                <p className={`text-xs ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>{nextLevel.title} ({nextLevel.icon})</p>
              ) : (
                <p className={`text-xs ${isDarkMode ? 'text-[#00A884]' : 'text-emerald-500'}`}>Livello Massimo Raggiunto!</p>
              )}
            </div>
            {nextLevel && (
              <span className={`text-xs font-bold ${isDarkMode ? 'text-[#00A884]' : 'text-[#008069]'}`}>
                {stats.xp} / {xpForNext} XP
              </span>
            )}
          </div>
          
          <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2A3942]' : 'bg-slate-100'}`}>
            <div 
              className={`h-full transition-all duration-1000 ${isDarkMode ? 'bg-gradient-to-r from-[#00A884] to-emerald-600' : 'bg-gradient-to-r from-emerald-400 to-[#008069]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {nextLevel && (
            <p className={`text-[10px] text-center mt-2 ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-400'}`}>
              Mancano {xpForNext - stats.xp} XP per salire di livello
            </p>
          )}
        </div>

        {/* Obiettivi / Badges (Placeholder per ora) */}
        <div className={`rounded-2xl p-4 shadow-sm border ${isDarkMode ? 'bg-[#202C33] border-[#2A3942]' : 'bg-white border-slate-100'}`}>
          <h3 className={`font-bold text-[15px] mb-3 ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>I tuoi Traguardi</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className={`flex flex-col items-center p-2 rounded-xl border opacity-100 ${
              isDarkMode ? 'bg-[#00A884]/10 border-[#00A884]/20' : 'bg-emerald-50 border-emerald-100'
            }`}>
              <span className="text-2xl mb-1">🔥</span>
              <span className={`text-[10px] font-bold text-center leading-tight ${isDarkMode ? 'text-[#00A884]' : 'text-emerald-900'}`}>Primo Giorno</span>
            </div>
            <div className={`flex flex-col items-center p-2 rounded-xl border opacity-50 grayscale ${
              isDarkMode ? 'bg-[#2A3942] border-[#202C33]' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-2xl mb-1">📅</span>
              <span className={`text-[10px] font-bold text-center leading-tight ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>1 Settimana</span>
            </div>
            <div className={`flex flex-col items-center p-2 rounded-xl border opacity-50 grayscale ${
              isDarkMode ? 'bg-[#2A3942] border-[#202C33]' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-2xl mb-1">💯</span>
              <span className={`text-[10px] font-bold text-center leading-tight ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}>Primo 10</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
