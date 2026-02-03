import React from "react";

const SelectSemester: React.FC = () => {
  const levels = [
    { id: 1, title: "INITIATION", subtitle: "SEMESTER 01" },
    { id: 2, title: "FOUNDATION", subtitle: "SEMESTER 02" },
    { id: 3, title: "INTERMEDIATE", subtitle: "SEMESTER 03" },
    { id: 4, title: "ADVANCED", subtitle: "SEMESTER 04" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <h1 className="text-white font-mono text-4xl mb-20 tracking-[0.5em] text-center relative z-10 cursor-default mix-blend-difference">
        SELECT LEVEL
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full z-10">
        {levels.map((level) => (
          <button
            key={level.id}
            className="cursor-target group relative h-[500px] bg-white/5 border border-white/20 backdrop-blur-sm
                                 flex flex-col justify-between p-6 transition-all duration-300 ease-out
                                 hover:border-white hover:bg-white hover:text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            {/* Header Details */}
            <div className="flex justify-between items-start font-mono text-xs text-white/60 group-hover:text-black/60 transition-colors duration-300">
              <span className="tracking-widest">
                DATA_MOD_{level.id.toString().padStart(2, "0")}
              </span>
              <span className="border border-white/30 px-2 py-0.5 rounded group-hover:border-black/30">
                STATUS: READY
              </span>
            </div>

            {/* Main Content */}
            <div className="space-y-4 text-left relative z-10 text-white group-hover:text-black transition-colors duration-300">
              <div className="text-8xl font-black tracking-tighter opacity-30 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2">
                {level.id}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-widest mb-1 group-hover:tracking-[0.2em] transition-all duration-300">
                  {level.title}
                </h2>
                <p className="font-mono text-sm opacity-60">{level.subtitle}</p>
              </div>
            </div>

            {/* Footer Details */}
            <div className="w-full">
              <div className="h-px w-full bg-current opacity-30 my-4" />
              <div className="flex justify-between items-end font-mono text-xs">
                <div className="flex flex-col gap-1">
                  <span className="w-16 h-1 bg-current opacity-50" />
                  <span className="w-8 h-1 bg-current opacity-30" />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  [ENTER] &gt;&gt;
                </span>
              </div>
            </div>

            {/* Corner Accents (Static) */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white pointer-events-none group-hover:border-black" />
            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white pointer-events-none group-hover:border-black" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white pointer-events-none group-hover:border-black" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white pointer-events-none group-hover:border-black" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectSemester;
