
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Play, Download, Zap, Terminal, Code, Cpu, Music, Square, Volume2, Image as ImageIcon, X, Sparkles, Palette, Info, Upload, FileAudio, AlertTriangle, Activity, Keyboard, Timer } from 'lucide-react';
import Preview3D from './components/Preview3D';
import { generatePythonVisualizer } from './services/geminiService';
import { VisualizerConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<VisualizerConfig>({
    numCubes: 64, coreColor: '#3b82f6', ballColor: '#ffff00', ringRadius: 10, sensitivity: 1.5,
    cameraSpeed: 0.2, reactorName: "Omni-Core Alpha", audioFileName: "music.mp3", volume: 0.5
  });

  const [pythonCode, setPythonCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(true);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const togglePreview = useCallback(() => setIsPreviewActive(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePreview(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePreview]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setGenerationProgress(0); setGenerationStatus('正在啟動自適應頻譜分析...');
    const statuses = ['提取起始強度包絡...', '優化自適應跳躍動態...', '同步 LED 互動系統...', '完成旗艦腳本烘焙!'];
    let statusIdx = 0;
    progressIntervalRef.current = window.setInterval(() => {
      setGenerationProgress(p => p < 90 ? p + 10 : p);
      if (statusIdx < statuses.length - 1) { statusIdx++; setGenerationStatus(statuses[statusIdx]); }
    }, 250);

    try {
      const result = await generatePythonVisualizer(config);
      setPythonCode(result.code); setExplanation(result.explanation);
      setGenerationProgress(100); setGenerationStatus('烘焙完成！');
    } catch (e) { setGenerationStatus('生成失敗'); }
    finally {
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      setTimeout(() => { setIsGenerating(false); setGenerationProgress(0); }, 800);
    }
  }, [config]);

  const handleCopy = () => {
    if (!pythonCode) return;
    navigator.clipboard.writeText(pythonCode);
    alert("代碼已複製！");
  };

  const downloadScript = () => {
    if (!pythonCode) return;
    const blob = new Blob([pythonCode], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "main.py"; a.click();
  };

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-300 font-sans overflow-hidden">
      <aside className="w-80 border-r border-white/5 bg-[#0a0a0a] p-6 flex flex-col gap-8 overflow-y-auto shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20"><Zap className="text-white" size={20} /></div>
          <h1 className="text-xl font-bold text-white tracking-tight italic">FLUX STUDIO</h1>
        </div>
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase border-b border-white/5 pb-2"><Settings size={14} /><span>核心參數</span></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">專案名稱</label>
              <input type="text" value={config.reactorName} onChange={e => setConfig({...config, reactorName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-zinc-400"><Music size={14} className="text-blue-400" />音訊路徑</label>
              <div className="relative group">
                <input type="file" ref={audioInputRef} onChange={e => e.target.files?.[0] && setConfig({...config, audioFileName: e.target.files[0].name})} accept="audio/*" className="hidden" />
                <button onClick={() => audioInputRef.current?.click()} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-left hover:border-blue-500/50 transition-all flex items-center justify-between">
                  <span className="text-xs font-mono text-blue-200 truncate pr-2">{config.audioFileName}</span>
                  <Upload size={14} className="text-zinc-600" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-zinc-400"><Palette size={14} className="text-yellow-400" />核心顏色</label>
              <input type="color" value={config.ballColor} onChange={e => setConfig({...config, ballColor: e.target.value})} className="w-14 h-10 bg-zinc-900 border border-white/10 rounded p-1 cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs mb-1"><label className="text-zinc-400">跳躍感度</label><span className="text-blue-400">{config.sensitivity}x</span></div>
              <input type="range" min="0.5" max="3" step="0.1" value={config.sensitivity} onChange={e => setConfig({...config, sensitivity: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
            </div>
          </div>
          <button onClick={handleGenerate} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20"><Code size={20} />烘焙自適應腳本</button>
        </section>
        <section className="mt-auto p-4 bg-zinc-900/40 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><Keyboard size={14} className="text-blue-400" /> 鍵盤控制</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col items-center"><span className="text-blue-400 font-bold">Space</span><span className="text-zinc-500">切換播放</span></div>
            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col items-center"><span className="text-blue-400 font-bold">Seek</span><span className="text-zinc-500">進度跳轉</span></div>
          </div>
        </section>
      </aside>

      <main className="flex-1 flex flex-col p-8 overflow-hidden gap-6 min-w-0">
        <div className="flex-1 flex gap-8 min-h-0">
          <div className="flex-1 flex flex-col gap-4 min-w-0 relative">
            <h2 className="font-bold text-white text-lg px-2 flex items-center gap-2"><Activity size={18} className="text-blue-400" />物理預覽引擎</h2>
            <div className="flex-1 relative group bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5">
              <Preview3D config={config} isActive={isPreviewActive} />
              
              <div className="absolute inset-x-0 bottom-0 h-32 flex items-end justify-center pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-8 bg-black/60 backdrop-blur-3xl px-12 py-6 rounded-t-[3rem] border-t border-x border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                  <button onClick={togglePreview} className={`p-6 rounded-full transition-all active:scale-90 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] border ${isPreviewActive ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-blue-600 text-white border-blue-400/50'}`}>
                    {isPreviewActive ? <Square size={26} fill="currentColor" /> : <Play size={26} fill="white" />}
                  </button>
                  
                  <div className="flex flex-col gap-4 min-w-[340px]">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full"><Timer size={12} className="text-blue-400" /> 01:24 / 03:45</span>
                      <span className="text-blue-400/80 animate-pulse font-mono tracking-tighter">ADAPTIVE SYNCING...</span>
                    </div>
                    <div className="relative h-2 bg-zinc-800 rounded-full cursor-pointer group/bar overflow-hidden border border-white/5">
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-300 w-1/3 shadow-[0_0_20px_rgba(59,130,246,0.7)]" />
                      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none flex">
                        {Array.from({length: 20}).map((_, i) => <div key={i} className="flex-1 border-r border-white/20" />)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-l border-white/10 pl-8">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Volume2 size={14} className="text-green-400" />
                    </div>
                    <div className="relative group/vol">
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={config.volume} 
                        onChange={e => setConfig({...config, volume: parseFloat(e.target.value)})} 
                        className="w-24 accent-green-400 h-1 rounded-full cursor-pointer hover:accent-green-300 transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!isPreviewActive && <div className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto" onClick={togglePreview}><div className="bg-blue-600/90 p-10 rounded-full shadow-2xl hover:scale-110 transition-transform"><Play size={50} className="text-white ml-2" fill="white" /></div></div>}
            </div>
          </div>
          <div className="w-80 flex flex-col gap-4 shrink-0">
            <h2 className="font-bold text-white text-lg px-2 flex items-center gap-2"><Info size={18} className="text-purple-400" />分析報告</h2>
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 flex-1 shadow-2xl space-y-4 text-xs">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-300 shadow-inner">
                {explanation || "分析系統已升級：自適應起始包絡分析現已支援動態強度映射。"}
              </div>
              <div className="space-y-2 pt-4">
                 <p className="font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-1">物理引擎進化：</p>
                 <ul className="list-disc pl-4 space-y-2 text-[10px] text-zinc-500">
                    <li><span className="text-blue-400">強度映射：</span>球體跳躍高度與漣漪速度會隨音樂節奏強弱自動調整。</li>
                    <li><span className="text-blue-400">精準追蹤：</span>採用 Onset Envelope 演算法，顯著提升複雜曲風的同步率。</li>
                    <li><span className="text-blue-400">自適應機制：</span>自動計算音軌動態範圍，確保所有音量下的視覺表現一致。</li>
                 </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1/3 min-h-0 bg-[#080808] rounded-3xl border border-white/10 flex flex-col shadow-2xl ring-1 ring-white/5">
          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
            <div className="flex items-center gap-2"><Terminal size={14} className="text-blue-500" /><span className="text-xs font-mono text-zinc-500 font-bold uppercase tracking-widest">main.py</span></div>
            <div className="flex items-center gap-4">
              <button onClick={handleCopy} className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white transition-colors">複製代碼</button>
              <button onClick={downloadScript} className="flex items-center gap-2 text-xs px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"><Download size={14} />下載腳本</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8 code-font text-sm leading-relaxed scrollbar-hide bg-black/20">
            {pythonCode ? <pre className="text-blue-200/80"><code>{pythonCode}</code></pre> : <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-4"><Zap size={40} /><span className="text-xs uppercase font-bold tracking-widest text-zinc-500">尚未烘焙同步代碼</span></div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
