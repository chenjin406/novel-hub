import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock Request/Response for API tests
globalThis.Request = class Request {
  constructor(public url: string, public init?: RequestInit) {}
  async json() {
    return JSON.parse(this.init?.body as string || '{}');
  }
} as any;

globalThis.Response = class Response {
  constructor(public body: any, public init?: any) {}
  static json(data: any, init?: any) {
    return { json: () => Promise.resolve(data), status: init?.status || 200 };
  }
} as any;

// Mock NextResponse
vi.mock('next/server', () => ({
  NextRequest: globalThis.Request,
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    }),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));
