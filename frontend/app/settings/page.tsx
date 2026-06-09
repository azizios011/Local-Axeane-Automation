'use client';

import { useState, useEffect } from 'react';
import { Blocks, Server, Eye, Sliders, Info, Save, RefreshCw, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAppContext } from '@/lib/context';

export default function SettingsPage() {
  const { apiUrl, setApiUrl, cdpPort, setCdpPort } = useAppContext();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localCdpPort, setLocalCdpPort] = useState(cdpPort);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [ngModels, setNgModels] = useState<{tag: string, ngModel: string, type: string, id: string}[] | null>(null);
  const { success, error, warning, info } = useToast();

  useEffect(() => {
    setLocalApiUrl(apiUrl);
    const savedPort = localStorage.getItem('CDP_PORT');
    if (savedPort) setLocalCdpPort(Number(savedPort));
  }, [apiUrl]);

  const handleSave = () => {
    setApiUrl(localApiUrl);
    setCdpPort(localCdpPort);
    apiClient.setBaseUrl(localApiUrl);
    localStorage.setItem('CDP_PORT', String(localCdpPort));
    success('Settings saved', 'API and CDP configuration updated successfully.');
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setNgModels(null);
    try {
      const res = await fetch(`${localApiUrl}/automation/discover?cdp_port=${localCdpPort}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Discovery failed');
      setNgModels(data.ng_models);
      success('Discovery complete', `Found ${data.count} ng-model fields on the page.`);
    } catch (err) {
      error('Discovery failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDiscovering(false);
    }
  };
    setIsTesting(true);
    setHealthStatus('idle');
    try {
      // Create a temporary client to test the provided URL
      const testClient = new (Object.getPrototypeOf(apiClient).constructor)(localApiUrl);
      const res = await testClient.getHealth();
      if (res.status === 'ok' || res.status === 'healthy' || res.status === 'online') {
        setHealthStatus('online');
        success('Connection successful', 'Backend is reachable and healthy.');
      } else {
        setHealthStatus('offline');
        warning('Partial connection', `Backend returned status: ${res.status}`);
      }
    } catch (err) {
      setHealthStatus('offline');
      error('Connection failed', err instanceof Error ? err.message : 'Could not reach backend');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <main className="ml-sidebar-width flex-1 p-lg pt-[88px] max-w-7xl mx-auto w-full mb-12">
      <div className="mb-lg flex items-center justify-between">
        <div>
          <p className="text-label-caps font-label-caps text-primary mb-1 uppercase tracking-wider">System Configuration</p>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-on-surface">API & Orchestration Panel</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-2">Configure the connection to the Axeane Filler backend services.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-primary text-surface-container-lowest hover:bg-primary-fixed px-lg py-2 rounded-md text-body-sm font-body-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
        >
          <Save className="w-[18px] h-[18px]" />
          Save Configuration
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Server className="w-4 h-4 text-secondary" />
              Backend Endpoint
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="base-url">Base API URL</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input 
                      className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      id="base-url" 
                      type="text" 
                      value={localApiUrl}
                      onChange={(e) => setLocalApiUrl(e.target.value)}
                      placeholder="http://localhost:8000"
                    />
                  </div>
                  <button 
                    onClick={testConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-md text-body-sm font-semibold text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : healthStatus === 'online' ? (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    ) : healthStatus === 'offline' ? (
                      <AlertCircle className="w-4 h-4 text-error" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Test
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  Status: {healthStatus === 'online' ? <span className="text-primary font-bold">ONLINE</span> : healthStatus === 'offline' ? <span className="text-error font-bold">OFFLINE</span> : 'NOT TESTED'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Blocks className="w-4 h-4 text-secondary" />
              LLM Extraction Provider
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="provider-tag">Provider</label>
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none" 
                    id="provider-tag"
                  >
                    <option value="gemini">Gemini (Default)</option>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="model-name">Model Name</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="model-name" type="text" defaultValue="gemini-1.5-flash" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-lg">
          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-secondary" />
              Automation Settings
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="cdp-port">
                  CDP Remote Debug Port
                </label>
                <div className="flex gap-3">
                  <input
                    className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary"
                    id="cdp-port"
                    type="number"
                    value={localCdpPort}
                    onChange={(e) => setLocalCdpPort(Number(e.target.value))}
                    placeholder="9222"
                  />
                  <button
                    onClick={handleDiscover}
                    disabled={isDiscovering}
                    className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-md text-body-sm font-semibold text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isDiscovering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Discover
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Open the Saisie des écritures form in the PWA first, then click Discover.
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-body-sm font-body-sm text-on-surface" htmlFor="delay">Type Speed Delay (ms)</label>
                  <span className="text-data-mono font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">50</span>
                </div>
                <input className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer" id="delay" max="500" min="0" step="10" type="range" defaultValue="50" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-body-sm font-body-sm text-on-surface" htmlFor="headless">Headless Mode</label>
                <input type="checkbox" id="headless" className="accent-primary w-4 h-4" defaultChecked={false} />
              </div>
            </div>
          </section>

          {ngModels && (
            <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
              <h3 className="text-label-caps font-label-caps text-secondary mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Eye className="w-4 h-4" />
                Discovered ng-models ({ngModels.length})
              </h3>
              <div className="overflow-auto max-h-64 rounded border border-outline-variant">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-surface-container-high sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-on-surface-variant">Tag</th>
                      <th className="px-3 py-2 text-left text-on-surface-variant">ng-model</th>
                      <th className="px-3 py-2 text-left text-on-surface-variant">Type</th>
                      <th className="px-3 py-2 text-left text-on-surface-variant">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ngModels.map((m, i) => (
                      <tr key={i} className="border-t border-outline-variant hover:bg-surface-container-high">
                        <td className="px-3 py-1.5 text-on-surface-variant">{m.tag}</td>
                        <td className="px-3 py-1.5 text-primary">{m.ngModel}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{m.type}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{m.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="bg-surface-container-high p-4 rounded-lg border border-outline-variant">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-body-sm font-body-sm font-semibold text-on-surface">System Info</h4>
                <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Axeane Automation Bridge v2.4.0</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Frontend: Next.js 15.4</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
