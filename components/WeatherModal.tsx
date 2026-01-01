import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface WeatherModalProps {
  timeOfDay: number;
  currentWeather: string;
  onClose: () => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({ timeOfDay, currentWeather, onClose }) => {
  const getTemperature = () => {
    const hour = timeOfDay;
    const baseTemp = 28;
    const variation = 12;
    const tempCurve = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    return Math.round(baseTemp + tempCurve * variation);
  };

  const temperature = getTemperature();

  const weatherDescriptions = {
    CLEAR: {
      name: 'Clear Skies',
      desc: 'The sun blazes overhead, casting sharp shadows across the dusty streets.',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      humidity: '15-25%',
      visibility: 'Excellent'
    },
    OVERCAST: {
      name: 'Overcast',
      desc: 'Gray clouds blanket the sky, diffusing the harsh sunlight.',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      humidity: '45-60%',
      visibility: 'Moderate'
    },
    SANDSTORM: {
      name: 'Dust Storm',
      desc: 'Choking dust sweeps through the alleys, obscuring the distant hills.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      humidity: '5-10%',
      visibility: 'Poor'
    }
  };

  const weatherInfo = weatherDescriptions[currentWeather as keyof typeof weatherDescriptions] || weatherDescriptions.CLEAR;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-3 md:p-4 pointer-events-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-black/80 backdrop-blur-md border border-amber-800/50 rounded-lg shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-amber-900/40">
          <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Weather Report</h4>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-amber-100/50 hover:text-amber-100 -mr-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`${weatherInfo.bgColor} ${weatherInfo.borderColor} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-2xl font-bold ${weatherInfo.color} uppercase tracking-wide`}>
                {weatherInfo.name}
              </div>
              <div className={`w-3 h-3 rounded-full ${weatherInfo.color.replace('text-', 'bg-')} shadow-lg`}></div>
            </div>
            <p className="text-xs text-amber-100/60 leading-relaxed">
              {weatherInfo.desc}
            </p>
          </div>

          <div className="bg-black/50 border border-amber-900/40 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1">Temperature</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-bold text-white">{temperature}°</span>
                  <span className="text-sm text-amber-100/40 font-mono">C</span>
                </div>
                <div className="text-[10px] text-amber-100/30 font-mono mt-1">
                  {Math.round(temperature * 9 / 5 + 32)}°F
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-2">Time</div>
                <div className="text-sm font-mono text-amber-100/80">
                  {Math.floor(timeOfDay)}:{String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 border border-amber-900/30 rounded-lg p-3">
              <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1.5">Humidity</div>
              <div className="text-lg font-mono text-white">{weatherInfo.humidity}</div>
            </div>
            <div className="bg-black/30 border border-amber-900/30 rounded-lg p-3">
              <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1.5">Visibility</div>
              <div className="text-lg font-mono text-white">{weatherInfo.visibility}</div>
            </div>
          </div>

          <div className="text-[10px] text-amber-100/30 italic text-center pt-2 border-t border-white/5">
            Damascus, Summer 1348
          </div>
        </div>
      </div>
    </div>
  );
};
