'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  FolderOpen, 
  TrendingUp, 
  Sigma, 
  ScanLine,
  Receipt,
  FileText,
  AlertTriangle,
  RefreshCcw,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function DashboardPage() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await apiClient.getHealth();
        setIsOnline(res.status === 'ok' || res.status === 'healthy' || res.status === 'online');
      } catch (err) {
        setIsOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="ml-sidebar-width pt-[88px] px-lg pb-xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-md">
        <div>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-on-surface">System Overview</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Monitor extraction performance and automation health.</p>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded p-3 flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Backend Status</span>
            <span className={`text-data-mono font-data-mono ${isOnline ? 'text-primary' : 'text-error'}`}>
              {isOnline === null ? 'Checking...' : isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-primary pulse' : isOnline === false ? 'bg-error' : 'bg-outline'} ml-sm`}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-md relative z-10">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">Recent Extractions</h3>
            <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center justify-center">
              <ScanLine className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-display-lg font-display-lg text-on-surface">24</span>
            <div className="flex items-center gap-1 text-primary mt-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-data-mono font-data-mono">+12% from yesterday</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-md relative z-10">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">Total Documents</h3>
            <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center justify-center">
              <FolderOpen className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-display-lg font-display-lg text-on-surface">1,240</span>
            <div className="flex items-center gap-1 text-primary mt-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-data-mono font-data-mono">+45 this week</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-md relative z-10">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">Saved Formulas</h3>
            <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center justify-center">
              <Sigma className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-display-lg font-display-lg text-on-surface">15</span>
            <div className="flex items-center gap-1 text-on-surface-variant mt-1">
              <span className="w-4 h-4 text-center">-</span>
              <span className="text-data-mono font-data-mono">Unchanged</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-md relative z-10">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">Success Rate</h3>
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-display-lg font-display-lg text-primary">98.5%</span>
            <div className="flex items-center gap-1 text-primary mt-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-data-mono font-data-mono">+0.5% optimization</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-lg flex flex-col">
          <div className="p-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Recent Activity</h3>
            <button className="text-label-caps font-label-caps text-primary hover:text-primary-fixed transition-colors uppercase">View All</button>
          </div>
          <div className="flex-1 p-sm">
            <ul className="flex flex-col gap-xs">
              <li className="flex items-center justify-between p-sm hover:bg-surface-container-high rounded transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">Invoice INV-2023-001 Extracted</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">Auto-categorized via Formula A</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-data-mono font-data-mono text-on-surface-variant">10:42 AM</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-label-caps font-label-caps rounded border border-primary/20 uppercase">Success</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between p-sm hover:bg-surface-container-high rounded transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">Bank Statement Q3 Parsed</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">Batch processing completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-data-mono font-data-mono text-on-surface-variant">09:15 AM</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-label-caps font-label-caps rounded border border-primary/20 uppercase">Success</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between p-sm hover:bg-surface-container-high rounded transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-error/30 bg-error/10 flex items-center justify-center text-error">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">Vendor Receipt Unreadable</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">Low resolution image detected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-data-mono font-data-mono text-on-surface-variant">Yesterday</span>
                  <span className="px-2 py-1 bg-error/10 text-error text-label-caps font-label-caps rounded border border-error/20 uppercase">Failed</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between p-sm hover:bg-surface-container-high rounded transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                    <RefreshCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">ERP Synchronization</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">Pushed 42 records</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-data-mono font-data-mono text-on-surface-variant">Yesterday</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-label-caps font-label-caps rounded border border-primary/20 uppercase">Success</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between p-sm hover:bg-surface-container-high rounded transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-[#eab308]/30 bg-[#eab308]/10 flex items-center justify-center text-[#fef08a]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">Tax Form Processing</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">Awaiting manual review</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-data-mono font-data-mono text-on-surface-variant">Oct 24</span>
                  <span className="px-2 py-1 bg-[#eab308]/10 text-[#fef08a] text-label-caps font-label-caps rounded border border-[#eab308]/30 uppercase">Pending</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg flex flex-col p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">System Health</h3>
            <Activity className="w-5 h-5 text-on-surface-variant" />
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">Performance over last 7 days.</p>
          <div className="flex-1 flex items-end gap-2 h-40 mt-auto border-b border-outline-variant pb-2 relative">
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[60%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">60%</div>
            </div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[85%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">85%</div>
            </div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[40%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">40%</div>
            </div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[90%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">90%</div>
            </div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[75%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">75%</div>
            </div>
            <div className="flex-1 bg-primary rounded-t-sm h-[98%] hover:bg-primary-fixed transition-colors relative group shadow-[0_0_12px_rgba(78,222,163,0.3)]">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-on-primary-fixed text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">98%</div>
            </div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[88%] hover:bg-surface-variant transition-colors relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline-variant text-label-caps font-label-caps px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">88%</div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-label-caps font-label-caps text-on-surface-variant px-1 uppercase">
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span className="text-primary font-bold">S</span>
            <span>S</span>
          </div>
        </div>
      </div>
    </main>
  );
}
