import { Blocks, Server, Eye, Sliders, Info, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <main className="ml-sidebar-width flex-1 p-lg pt-[88px] max-w-7xl mx-auto w-full mb-12">
      <div className="mb-lg flex items-center justify-between">
        <div>
          <p className="text-label-caps font-label-caps text-primary mb-1 uppercase tracking-wider">System Configuration</p>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-on-surface">AI Orchestration & Context Configuration Panel</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-2">Dynamically point data pipelines to specialized localized nodes or secure remote endpoints.</p>
        </div>
        <button className="bg-primary text-surface-container-lowest hover:bg-primary-fixed px-lg py-2 rounded-md text-body-sm font-body-sm font-semibold transition-all flex items-center gap-2 shadow-sm">
          <Save className="w-[18px] h-[18px]" />
          Save Configuration
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Blocks className="w-4 h-4 text-secondary" />
              Core Provider & Model
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="provider-tag">Core Provider Tag</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="provider-tag" type="text" defaultValue="DeepSeek" />
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="model-name">Target Architecture Model Name</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="model-name" type="text" defaultValue="deepseek-chat" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Server className="w-4 h-4 text-secondary" />
              Endpoint Configuration
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="base-url">Base URL Target Endpoint</label>
                <div className="relative w-full">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="base-url" type="text" defaultValue="https://api.deepseek.com/v1/chat/completions" />
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="api-token">Bearer / Client API Security Token</label>
                <div className="relative w-full flex gap-2">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="api-token" type="password" defaultValue="sk-****************************************" />
                  <button className="h-[38px] px-3 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-md flex items-center justify-center transition-all bg-surface-container-highest">
                    <Eye className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-lg">
          <section className="bg-surface-container rounded-lg border border-outline-variant p-lg">
            <h3 className="text-label-caps font-label-caps text-secondary mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-secondary" />
              Hyperparameters
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-body-sm font-body-sm text-on-surface" htmlFor="temperature">Context Generation Temperature</label>
                  <span className="text-data-mono font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">0.1</span>
                </div>
                <input className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer" id="temperature" max="1" min="0" step="0.1" type="range" defaultValue="0.1" />
              </div>
              <div>
                <label className="block text-body-sm font-body-sm text-on-surface mb-2" htmlFor="max-tokens">Max Tokens Sequence Constraint</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-data-mono font-data-mono text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="max-tokens" type="number" defaultValue="3000" />
                </div>
              </div>
            </div>
          </section>

          <div className="bg-surface-container-high p-4 rounded-lg border border-outline-variant">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-body-sm font-body-sm font-semibold text-on-surface">System Info</h4>
                <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Axeane Automation Bridge v2.4.0-stable</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Last synced: 12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
