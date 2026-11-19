import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { integrationsApi } from '../api/client';
import { IntegrationSetting } from '../../../shared/types';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldCheck,
  Server,
  Zap,
  Globe,
  Sliders,
  ChevronRight
} from 'lucide-react';

export function IntegrationsCentrePage() {
  const { addToast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await integrationsApi.getAll();
      if (res.success && res.integrations) {
        setIntegrations(res.integrations);
      }
    } catch (err: any) {
      addToast('Failed to load integration settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    try {
      const res = await integrationsApi.testProvider(providerId);
      if (res.success) {
        addToast(`${providerId.toUpperCase()} health check: ${res.status} (${res.latencyMs}ms)`, res.status === 'connected' ? 'success' : 'info');
        // Refresh local list
        const updated = await integrationsApi.getAll();
        if (updated.success) setIntegrations(updated.integrations);
      }
    } catch (err: any) {
      addToast(`Health check error: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnable = async (providerId: string, currentEnabled: boolean) => {
    try {
      const res = await integrationsApi.update(providerId, { isEnabled: !currentEnabled });
      if (res.success) {
        setIntegrations(integrations.map((i) => (i.providerId === providerId ? { ...i, isEnabled: !currentEnabled } : i)));
        addToast(`${providerId} ${!currentEnabled ? 'enabled' : 'disabled'}`, 'info');
      }
    } catch {
      addToast('Failed to update integration state', 'error');
    }
  };

  const handleSaveApiKey = async (providerId: string) => {
    if (!keyInput.trim()) return;
    setIsSavingKey(true);
    try {
      const res = await integrationsApi.update(providerId, { apiKey: keyInput.trim() });
      if (res.success) {
        addToast(`API key configured for ${providerId} (masked for security)`, 'success');
        setEditingKeyId(null);
        setKeyInput('');
        const updated = await integrationsApi.getAll();
        if (updated.success) setIntegrations(updated.integrations);
      }
    } catch {
      addToast('Failed to save API key', 'error');
    } finally {
      setIsSavingKey(false);
    }
  };

  const getStatusBadge = (status: string, latencyMs: number) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Operational • {latencyMs}ms
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/40 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Degraded • {latencyMs}ms
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            Unavailable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/10">
            <Activity className="w-3 h-3 text-slate-400" />
            Not Tested
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[#493522] pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="accent">
            CSE279 API Ecosystem
          </Badge>
          <span className="text-xs text-[#D9C39B]/60 font-mono">• Live Telemetry & Secret Isolation</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5EBD8] font-serif">
          API & Integrations Centre
        </h1>

        <p className="text-sm font-serif text-[#D9C39B]/80 max-w-2xl leading-relaxed">
          Monitor the real-time operational status, round-trip latency, and credentials of all integrated educational APIs. LearnSphere enriches university study material with verified open data sources while isolating secret tokens on the server.
        </p>
      </div>

      {/* 2. Global Status Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-[#493522] p-5 bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <div className="flex items-center justify-between">
            <span className="font-serif text-xs text-[#D9C39B] font-medium uppercase tracking-wider text-[11px]">Registered Integrations</span>
            <Server className="w-4 h-4 text-[#C69B56]" />
          </div>
          <p className="text-3xl font-serif font-extrabold text-[#F5EBD8] mt-2">
            {integrations.length} APIs
          </p>
          <span className="text-[11px] font-serif text-[#D9C39B]/70 block mt-1">4 Academic + 4 Computational/Research</span>
        </Card>

        <Card className="border border-[#493522] p-5 bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <div className="flex items-center justify-between">
            <span className="font-serif text-xs text-[#D9C39B] font-medium uppercase tracking-wider text-[11px]">Active Services</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-serif font-extrabold text-[#F5EBD8] mt-2">
            {integrations.filter((i) => i.isEnabled).length} Enabled
          </p>
          <span className="text-[11px] font-serif text-emerald-400 block mt-1">100% Deterministic Fallback Guaranteed</span>
        </Card>

        <Card className="border border-[#493522] p-5 bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <div className="flex items-center justify-between">
            <span className="font-serif text-xs text-[#D9C39B] font-medium uppercase tracking-wider text-[11px]">Credential Protection</span>
            <ShieldCheck className="w-4 h-4 text-[#B18A4C]" />
          </div>
          <p className="text-3xl font-serif font-extrabold text-[#F5EBD8] mt-2">
            Isolated
          </p>
          <span className="text-[11px] font-serif text-[#D9C39B]/70 block mt-1">Keys masked • Never exposed to client DOM</span>
        </Card>
      </div>

      {/* 3. Detailed Integrations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#F5EBD8]">
            Educational API Inventory
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={loadIntegrations}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Status
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-[#1C1510]" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((item) => (
              <Card
                key={item.providerId}
                className="border border-[#493522] shadow-leather bg-[#281F19]/95 backdrop-blur-md p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-sm text-[#F5EBD8]">
                        {item.providerName}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Auth: {item.authType.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#D9C39B]/70 font-mono">
                      Base Endpoint: {item.baseUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.healthStatus, item.latencyMs)}
                    <button
                      onClick={() => handleToggleEnable(item.providerId, item.isEnabled)}
                      className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors ${
                        item.isEnabled
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                          : 'border-[#493522] text-[#D9C39B] hover:text-[#F5EBD8]'
                      }`}
                    >
                      {item.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {item.details && (
                  <p className="text-xs text-[#D9C39B] bg-[#1C1510] p-3 rounded-xl border border-[#493522] font-mono">
                    {item.details}
                  </p>
                )}

                {/* API Key Configuration Row if Key Auth Supported */}
                {item.authType === 'api_key' && (
                  <div className="pt-2 border-t border-[#493522] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#D9C39B]">
                      <Key className="w-3.5 h-3.5 text-[#B18A4C]" />
                      <span>API Key:</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1C1510] text-[#D9C39B] border border-[#493522]">
                        {item.apiKeyMasked || 'Default Public Pool (No Key Required)'}
                      </span>
                    </div>

                    {editingKeyId === item.providerId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Paste API Key..."
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C]"
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleSaveApiKey(item.providerId)}
                          isLoading={isSavingKey}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingKeyId(null);
                            setKeyInput('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingKeyId(item.providerId);
                          setKeyInput('');
                        }}
                        className="text-xs text-[#C69B56] hover:text-[#F5EBD8] underline font-medium"
                      >
                        Change Key
                      </button>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="pt-1 flex items-center justify-between text-xs border-t border-[#493522]">
                  <a
                    href={item.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C69B56] hover:text-[#F5EBD8] hover:underline flex items-center gap-1 font-medium"
                  >
                    API Documentation <ExternalLink className="w-3 h-3" />
                  </a>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(item.providerId)}
                    isLoading={testingId === item.providerId}
                    leftIcon={<Activity className="w-3 h-3" />}
                  >
                    Test Live Connection
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
