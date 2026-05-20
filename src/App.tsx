import { useMemo, useState } from 'react';
import { Shield, Upload, Loader2, Database, BarChart3, Boxes, LineChart } from 'lucide-react';
import { useCodexData } from './hooks/useCodexData';
import StatsCards from './components/StatsCards';
import DailyChart from './components/DailyChart';
import MonthlyChart from './components/MonthlyChart';
import TokenBreakdown from './components/TokenBreakdown';
import SessionTable from './components/SessionTable';
import ExportMarkdown from './components/ExportMarkdown';
import SourceOverview from './components/SourceOverview';
import ModelOverview from './components/ModelOverview';
import { summarizeUsage } from './utils/usage';

type ViewMode = 'overview' | 'sources' | 'models';

function App() {
  const { data, loading, error, uploadData } = useCodexData();
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const summary = useMemo(() => (data ? summarizeUsage(data) : null), [data]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      uploadData(file);
    }
  };

  const hasData = data && (data.daily || data.monthly || data.sessions);
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'sources' as const, label: 'Sources', icon: Boxes },
    { id: 'models' as const, label: 'Models', icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Local AI Usage Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
            <Shield size={14} />
            100% Local
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading usage data...
          </div>
        )}

        {error && !hasData && (
          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={32} className="mx-auto mb-3 text-slate-400" />
            <h3 className="text-slate-800 font-medium mb-1">No usage data found</h3>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <div className="text-xs text-slate-400 mb-4">
              Or drop a ccusage JSON file here (daily.json / session.json / monthly.json)
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer">
              <Upload size={14} />
              Upload JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadData(file);
                }}
              />
            </label>
          </div>
        )}

        {hasData && (
          <>
            <StatsCards data={data} />

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium border transition-colors ${
                    viewMode === tab.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
              {summary && (
                <div className="ml-auto text-xs text-slate-500">
                  {summary.activeSources.length} sources · {summary.activeModels.length} models
                </div>
              )}
            </div>

            {viewMode === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-6 mb-8">
                  {data.daily && data.daily.length > 0 && <DailyChart daily={data.daily} />}
                  {data.monthly && data.monthly.length > 0 && <MonthlyChart monthly={data.monthly} />}
                </div>

                <TokenBreakdown data={data} />
              </>
            )}

            {viewMode === 'sources' && <SourceOverview data={data} />}

            {viewMode === 'models' && <ModelOverview data={data} />}

            {data.sessions && data.sessions.length > 0 && (
              <SessionTable sessions={data.sessions} />
            )}

            <ExportMarkdown data={data} />

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Shield size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-slate-800">Privacy First</h4>
                <p className="text-xs text-slate-500 mt-1">
                  This tool only reads local ccusage-supported session logs. It does not upload prompts,
                  responses, code, or usage data anywhere. All processing happens in your browser.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-xs text-slate-400">
          <span>Local AI Usage Dashboard</span>
          <span>Data never leaves your machine</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
