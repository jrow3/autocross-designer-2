import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCreatorToken } from './creatorToken';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (client) return client;

	const url = import.meta.env.VITE_SUPABASE_URL;
	const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

	if (!url || !key) return null;

	client = createClient(url, key, {
		global: {
			headers: { 'x-creator-token': getCreatorToken() }
		}
	});
	return client;
}

export function isSupabaseConfigured(): boolean {
	return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
