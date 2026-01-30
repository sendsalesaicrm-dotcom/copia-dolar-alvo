import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isValidUrl = (url?: string) => !!url && /^https?:\/\//i.test(url);

let client: any;

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');

  type QueryResult<T=any> = { data: T | null; error: { message: string } | null };
  const notConfigured = { message: 'Supabase not configured: set env vars.' };

  const stub = {
    from(_table: string) {
      const q = {
        select: async (): Promise<QueryResult<any[]>> => ({ data: null, error: notConfigured }),
        insert: async (): Promise<QueryResult> => ({ data: null, error: notConfigured }),
        update: async (): Promise<QueryResult> => ({ data: null, error: notConfigured }),
        delete: async (): Promise<QueryResult> => ({ data: null, error: notConfigured }),
        eq: (_: string, __: any) => q,
        order: (_: string, __?: any) => q,
        not: (_: string, __: any, ___?: any) => q,
        single: async (): Promise<QueryResult<any>> => ({ data: null, error: notConfigured }),
      };
      return q;
    },
    rpc(_fn: string, _args?: Record<string, any>): Promise<QueryResult> {
      return Promise.resolve({ data: null, error: notConfigured });
    },
    channel(_name: string) {
      const self = {
        on: (_evt: any, _filter: any, _cb: any) => self,
        subscribe: () => ({ subscription: { unsubscribe() {} } }),
      };
      return self;
    },
    removeChannel(_ch: any) {},
    auth: {
      async getSession() { return { data: { session: null }, error: null }; },
      onAuthStateChange(_cb: any) { return { data: { subscription: { unsubscribe() {} } } }; },
      async signOut() { return { error: null }; },
    },
  } as any;

  client = stub;
} else {
  client = createClient(supabaseUrl!, supabaseAnonKey!);
}

export const supabase = client;