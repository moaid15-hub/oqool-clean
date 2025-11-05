// fullstack-integrator-agent.ts
// ============================================
// 🔗 Full-Stack Integrator Agent - الرابط
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

export interface APIIntegration {
  endpoint: string;
  method: string;
  frontendFunction: string;
  hookName?: string;
  stateManagement?: string;
  errorHandling: string;
  loading: string;
  code: string;
}

export interface DataFlow {
  component: string;
  action: string;
  apiCall: string;
  dataTransformation?: string;
  stateUpdate: string;
  uiUpdate: string;
}

export interface IntegrationResult {
  apiClient: {
    baseUrl: string;
    code: string;
    interceptors: string[];
  };
  hooks: Array<{
    name: string;
    purpose: string;
    code: string;
  }>;
  integrations: APIIntegration[];
  dataFlows: DataFlow[];
  errorBoundary: string;
  loadingStates: string;
  typeDefinitions: string;
  envVariables: string[];
}

export class FullStackIntegratorAgent {
  private aiAdapter: UnifiedAIAdapter;

  private provider: AIProvider;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    const hasValidClaude = config.claude?.startsWith('sk-ant-');

    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: hasValidClaude ? 'claude' : 'deepseek',
    });
    this.provider = provider;
  }

  async integrate(specification: {
    frontend: {
      framework: string;
      components: string[];
      stateManagement: string;
    };
    backend: {
      baseUrl: string;
      endpoints: Array<{
        method: string;
        path: string;
        description: string;
      }>;
      authentication: string;
    };
    features: string[];
  }): Promise<IntegrationResult> {
    // 1. Create API client
    const apiClient = await this.createAPIClient(specification);

    // 2. Generate custom hooks
    const hooks = await this.generateHooks(specification);

    // 3. Create API integrations for each endpoint
    const integrations = await this.createIntegrations(specification);

    // 4. Map data flows
    const dataFlows = await this.mapDataFlows(specification);

    // 5. Create error boundary
    const errorBoundary = await this.createErrorBoundary(specification.frontend.framework);

    // 6. Design loading states
    const loadingStates = await this.designLoadingStates(specification.frontend.framework);

    // 7. Generate TypeScript types
    const typeDefinitions = await this.generateTypeDefinitions(specification);

    // 8. List environment variables
    const envVariables = this.listEnvVariables(specification);

    return {
      apiClient,
      hooks,
      integrations,
      dataFlows,
      errorBoundary,
      loadingStates,
      typeDefinitions,
      envVariables,
    };
  }

  // ============================================
  // Create API client
  // ============================================
  private async createAPIClient(spec: any): Promise<any> {
    const hasAuth = spec.backend.authentication !== 'None';

    const prompt = `
Create a production-ready API client for:

Frontend: ${spec.frontend.framework}
Backend URL: ${spec.backend.baseUrl}
Authentication: ${spec.backend.authentication}

Requirements:
1. Axios or Fetch wrapper
2. Base URL configuration
3. Request interceptors (add auth token)
4. Response interceptors (handle errors)
5. Timeout handling
6. Retry logic for failed requests
7. Request/Response logging (dev only)
8. Type-safe (if TypeScript)

${
  hasAuth
    ? `
Authentication flow:
- Add Authorization header with token
- Handle 401 (refresh token or redirect to login)
- Store token in localStorage/cookies
`
    : ''
}

Output format (JSON):
\`\`\`json
{
  "baseUrl": "${spec.backend.baseUrl}",
  "code": "// Complete API client code here",
  "interceptors": [
    "Request: Add auth token",
    "Request: Add correlation ID",
    "Response: Parse errors",
    "Response: Handle 401"
  ]
}
\`\`\`

Use modern best practices!
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to create API client');
      return {
        baseUrl: spec.backend.baseUrl,
        code: '',
        interceptors: [],
      };
    }
  }

  // ============================================
  // Generate hooks
  // ============================================
  private async generateHooks(spec: any): Promise<any[]> {
    const framework = spec.frontend.framework;

    // Only generate hooks for React-based frameworks
    if (!['react', 'nextjs'].includes(framework.toLowerCase())) {
      return [];
    }

    const prompt = `
Create custom React hooks for API integration:

Features: ${spec.features.join(', ')}
State Management: ${spec.frontend.stateManagement}

Create hooks for:
1. 🔄 useQuery - Fetch data (like React Query)
2. ✏️ useMutation - Create/Update/Delete
3. 🔐 useAuth - Authentication state
4. 📄 usePagination - Paginated data
5. 🔍 useDebounce - Debounced search

Each hook should handle:
- Loading states
- Error states
- Success states
- Caching (if applicable)
- Automatic retries
- Type safety

Output format (JSON):
\`\`\`json
{
  "hooks": [
    {
      "name": "useQuery",
      "purpose": "Fetch and cache data with loading/error states",
      "code": "export function useQuery<T>(key: string, fetcher: () => Promise<T>) { ... }"
    }
  ]
}
\`\`\`

Make them reusable and production-ready!
    `;

    try {
      const response = await this.callClaude(prompt);
      const data = this.parseJSON(response);
      return data.hooks || [];
    } catch (error) {
      console.error('Failed to generate hooks');
      return [];
    }
  }

  // ============================================
  // Create integrations
  // ============================================
  private async createIntegrations(spec: any): Promise<APIIntegration[]> {
    const integrations: APIIntegration[] = [];

    // Generate integration for each endpoint
    for (const endpoint of spec.backend.endpoints.slice(0, 10)) {
      // Limit to 10
      const integration = await this.createSingleIntegration(endpoint, spec.frontend, spec.backend);
      if (integration) {
        integrations.push(integration);
      }
    }

    return integrations;
  }

  // ============================================
  // Create single integration
  // ============================================
  private async createSingleIntegration(
    endpoint: any,
    frontend: any,
    backend: any
  ): Promise<APIIntegration | null> {
    const prompt = `
Create frontend integration for this API endpoint:

Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description}
Frontend: ${frontend.framework}
State Management: ${frontend.stateManagement}

Generate:
1. Frontend function to call this endpoint
2. Custom hook (if React)
3. Loading state handling
4. Error handling
5. Success handling
6. Type definitions

Output format (JSON):
\`\`\`json
{
  "endpoint": "${endpoint.path}",
  "method": "${endpoint.method}",
  "frontendFunction": "fetchUsers",
  "hookName": "useUsers",
  "stateManagement": "useState",
  "errorHandling": "try-catch with toast notification",
  "loading": "isLoading state + spinner",
  "code": "// Complete integration code"
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error(`Failed to create integration for ${endpoint.path}`);
      return null;
    }
  }

  // ============================================
  // Map data flows
  // ============================================
  private async mapDataFlows(spec: any): Promise<DataFlow[]> {
    const prompt = `
Map the complete data flow from UI to API for key features:

Features: ${spec.features.join(', ')}
Components: ${spec.frontend.components.join(', ')}
Endpoints: ${spec.backend.endpoints.map((e: any) => `${e.method} ${e.path}`).join(', ')}

For each major user action, describe the flow:
1. User action in component
2. Event handler called
3. API call made
4. Data transformation (if needed)
5. State updated
6. UI re-rendered

Output format (JSON):
\`\`\`json
{
  "flows": [
    {
      "component": "LoginForm",
      "action": "User submits login form",
      "apiCall": "POST /api/auth/login",
      "dataTransformation": "Store token in localStorage",
      "stateUpdate": "Set user in AuthContext",
      "uiUpdate": "Redirect to dashboard"
    }
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const data = this.parseJSON(response);
      return data.flows || [];
    } catch (error) {
      console.error('Failed to map data flows');
      return [];
    }
  }

  // ============================================
  // Create error boundary
  // ============================================
  private async createErrorBoundary(framework: string): Promise<string> {
    if (!['react', 'nextjs'].includes(framework.toLowerCase())) {
      return '// Error boundary not applicable for ' + framework;
    }

    return `
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
    `.trim();
  }

  // ============================================
  // Design loading states
  // ============================================
  private async designLoadingStates(framework: string): Promise<string> {
    return `
Loading State Patterns:

1. **Skeleton Screens** (Preferred):
   - Show content placeholder with shimmer effect
   - Maintains layout, prevents layout shift
   - Better UX than spinners

2. **Spinners**:
   - For quick operations (<2s)
   - Small inline spinners for buttons
   - Full-page spinner for initial load

3. **Progress Bars**:
   - For operations with known duration
   - File uploads, multi-step processes

4. **Optimistic Updates**:
   - Update UI immediately
   - Revert if API call fails
   - Great for likes, favorites, etc.

5. **Suspense** (React 18+):
   - Declarative loading boundaries
   - Automatic loading states

Implementation:
\`\`\`typescript
// Loading Hook
export function useLoading() {
  const [isLoading, setIsLoading] = useState(false);
  
  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      return await fn();
    } finally {
      setIsLoading(false);
    }
  };
  
  return { isLoading, withLoading };
}

// Skeleton Component
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={\`animate-pulse bg-gray-200 rounded \${className}\`} />
  );
}
\`\`\`
    `.trim();
  }

  // ============================================
  // Generate type definitions
  // ============================================
  private async generateTypeDefinitions(spec: any): Promise<string> {
    const prompt = `
Generate TypeScript type definitions for API integration:

Endpoints: ${spec.backend.endpoints.map((e: any) => `${e.method} ${e.path}`).join(', ')}

Create types for:
1. API request bodies
2. API response bodies
3. Frontend state shapes
4. Hook return types

Output format (TypeScript):
\`\`\`typescript
// Type definitions here
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const match = response.match(/```typescript\n([\s\S]*?)\n```/);
      return match ? match[1].trim() : '// No types generated';
    } catch (error) {
      return '// Failed to generate types';
    }
  }

  // ============================================
  // List environment variables
  // ============================================
  private listEnvVariables(spec: any): string[] {
    const vars = [`VITE_API_URL=${spec.backend.baseUrl}`, 'VITE_API_TIMEOUT=10000'];

    if (spec.backend.authentication !== 'None') {
      vars.push('VITE_AUTH_STORAGE_KEY=auth_token');
    }

    vars.push('VITE_ENVIRONMENT=development');
    vars.push('VITE_LOG_LEVEL=debug');

    return vars;
  }

  // ============================================
  // Call Claude API
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'coder',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse JSON
  // ============================================
  private parseJSON(response: string): any {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return {};
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      console.error('Failed to parse JSON');
      return {};
    }
  }
}
