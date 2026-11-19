import { run, query, queryOne } from '../db/index.js';
import { IntegrationSetting } from '../../../shared/types.js';

const INITIAL_INTEGRATIONS: Array<{
  providerId: string;
  providerName: string;
  category: 'academic' | 'literature' | 'computation' | 'assessment';
  baseUrl: string;
  documentationUrl: string;
  authType: 'none' | 'api_key' | 'oauth' | 'bearer';
  healthCheckUrl: string;
}> = [
  {
    providerId: 'wikipedia',
    providerName: 'Wikipedia REST API',
    category: 'academic',
    baseUrl: 'https://en.wikipedia.org/api/rest_v1',
    documentationUrl: 'https://en.wikipedia.org/api/rest_v1/#/',
    authType: 'none',
    healthCheckUrl: 'https://en.wikipedia.org/api/rest_v1/page/summary/Algorithm'
  },
  {
    providerId: 'openlibrary',
    providerName: 'Open Library Subjects API',
    category: 'literature',
    baseUrl: 'https://openlibrary.org',
    documentationUrl: 'https://openlibrary.org/developers/api',
    authType: 'none',
    healthCheckUrl: 'https://openlibrary.org/subjects/computer_science.json?limit=1'
  },
  {
    providerId: 'opentrivia',
    providerName: 'Open Trivia Database API',
    category: 'assessment',
    baseUrl: 'https://opentdb.com',
    documentationUrl: 'https://opentdb.com/api_config.php',
    authType: 'none',
    healthCheckUrl: 'https://opentdb.com/api.php?amount=1'
  },
  {
    providerId: 'freedictionary',
    providerName: 'Free Dictionary API',
    category: 'academic',
    baseUrl: 'https://api.dictionaryapi.dev/api/v2',
    documentationUrl: 'https://dictionaryapi.dev/',
    authType: 'none',
    healthCheckUrl: 'https://api.dictionaryapi.dev/api/v2/entries/en/algorithm'
  },
  {
    providerId: 'openalex',
    providerName: 'OpenAlex Scholarly Works API',
    category: 'academic',
    baseUrl: 'https://api.openalex.org',
    documentationUrl: 'https://docs.openalex.org/',
    authType: 'none',
    healthCheckUrl: 'https://api.openalex.org/works?per_page=1'
  },
  {
    providerId: 'arxiv',
    providerName: 'arXiv STEM Preprints API',
    category: 'academic',
    baseUrl: 'https://export.arxiv.org/api',
    documentationUrl: 'https://info.arxiv.org/help/api/index.html',
    authType: 'none',
    healthCheckUrl: 'https://export.arxiv.org/api/query?search_query=all:algorithm&max_results=1'
  },
  {
    providerId: 'gutendex',
    providerName: 'Gutendex (Project Gutenberg) API',
    category: 'literature',
    baseUrl: 'https://gutendex.com',
    documentationUrl: 'https://gutendex.com/',
    authType: 'none',
    healthCheckUrl: 'https://gutendex.com/books/?search=science'
  },
  {
    providerId: 'mathjs',
    providerName: 'MathJS Computational API',
    category: 'computation',
    baseUrl: 'https://api.mathjs.org/v4',
    documentationUrl: 'https://mathjs.org/docs/index.html',
    authType: 'none',
    healthCheckUrl: 'https://api.mathjs.org/v4/?expr=2%2B2'
  }
];

export class IntegrationsService {
  /**
   * Initializes integration metadata records in database if not present
   */
  static async initIntegrations(): Promise<void> {
    for (const item of INITIAL_INTEGRATIONS) {
      const existing = await queryOne('SELECT id FROM integration_settings WHERE provider_id = ?', [item.providerId]);
      if (!existing) {
        const id = `integ-${item.providerId}`;
        await run(
          `INSERT INTO integration_settings (id, provider_id, provider_name, category, is_enabled, base_url, documentation_url, auth_type, health_status)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'connected')`,
          [id, item.providerId, item.providerName, item.category, item.baseUrl, item.documentationUrl, item.authType]
        );
      }
    }
  }

  /**
   * Retrieves all integration configurations for the API & Integrations Centre
   */
  static async getAllIntegrations(): Promise<IntegrationSetting[]> {
    await this.initIntegrations();
    const rows = await query<any>(
      `SELECT id, provider_id as providerId, provider_name as providerName,
              category, is_enabled as isEnabled, api_key_masked as apiKeyMasked,
              base_url as baseUrl, documentation_url as documentationUrl,
              auth_type as authType, last_health_check as lastHealthCheck,
              health_status as healthStatus, latency_ms as latencyMs, details
       FROM integration_settings
       ORDER BY category ASC, provider_name ASC`
    );
    return rows.map(r => ({
      ...r,
      isEnabled: Boolean(r.isEnabled)
    }));
  }

  /**
   * Executes a real live health check against an integration endpoint
   */
  static async testIntegration(providerId: string): Promise<{
    status: 'connected' | 'degraded' | 'unavailable';
    latencyMs: number;
    details: string;
  }> {
    const config = INITIAL_INTEGRATIONS.find(i => i.providerId === providerId);
    if (!config) {
      throw new Error(`Integration provider "${providerId}" not registered`);
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch(config.healthCheckUrl, {
        headers: { 'User-Agent': 'LearnSphere-HealthMonitor/2.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      let status: 'connected' | 'degraded' | 'unavailable' = 'connected';
      let details = `HTTP ${res.status} OK — Latency ${latencyMs}ms. Service operational.`;

      if (!res.ok) {
        status = res.status === 429 ? 'degraded' : 'unavailable';
        details = `HTTP ${res.status}: ${res.statusText}. Connection degraded.`;
      } else if (latencyMs > 2500) {
        status = 'degraded';
        details = `High latency detected: ${latencyMs}ms.`;
      }

      // Update DB record
      await run(
        `UPDATE integration_settings
         SET health_status = ?, latency_ms = ?, last_health_check = datetime('now'), details = ?
         WHERE provider_id = ?`,
        [status, latencyMs, details, providerId]
      );

      return { status, latencyMs, details };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const details = err.name === 'AbortError' ? 'Connection timed out (>4500ms)' : `Network error: ${err.message}`;

      await run(
        `UPDATE integration_settings
         SET health_status = 'unavailable', latency_ms = ?, last_health_check = datetime('now'), details = ?
         WHERE provider_id = ?`,
        [latencyMs, details, providerId]
      );

      return { status: 'unavailable', latencyMs, details };
    }
  }

  /**
   * Updates integration setting, masking credentials for frontend security
   */
  static async updateIntegration(
    providerId: string,
    updates: { isEnabled?: boolean; apiKey?: string }
  ): Promise<void> {
    if (updates.apiKey !== undefined) {
      const key = updates.apiKey.trim();
      const masked = key.length > 8 ? `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}` : '••••••••';
      await run(
        `UPDATE integration_settings
         SET api_key_masked = ?, api_key_encrypted = ?, updated_at = datetime('now')
         WHERE provider_id = ?`,
        [masked, key, providerId]
      );
    }

    if (updates.isEnabled !== undefined) {
      await run(
        `UPDATE integration_settings
         SET is_enabled = ?, updated_at = datetime('now')
         WHERE provider_id = ?`,
        [updates.isEnabled ? 1 : 0, providerId]
      );
    }
  }
}
