import { getSupabase, isSupabaseConfigured } from './supabase';
import { getCreatorToken } from './creatorToken';
import type { CourseData } from '$lib/types/course';

export interface SavedCourse {
	id: string;
	title: string;
	data: CourseData;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

// --- Supabase operations ---

export async function saveCourse(title: string, data: CourseData, isPublic = true): Promise<SavedCourse | null> {
	const sb = getSupabase();
	if (!sb) return null;

	const { data: row, error } = await sb
		.from('courses')
		.insert({ creator_token: getCreatorToken(), title, data, is_public: isPublic })
		.select()
		.single();

	if (error) {
		console.error('saveCourse:', error);
		return null;
	}
	return row as SavedCourse;
}

export async function updateCourse(id: string, title: string, data: CourseData): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;

	const { error } = await sb
		.from('courses')
		.update({ title, data })
		.eq('id', id);

	if (error) {
		console.error('updateCourse:', error);
		return false;
	}
	return true;
}

export async function loadCourse(id: string): Promise<SavedCourse | null> {
	const sb = getSupabase();
	if (!sb) return null;

	const { data: row, error } = await sb
		.from('courses')
		.select()
		.eq('id', id)
		.single();

	if (error) {
		console.error('loadCourse:', error);
		return null;
	}
	return row as SavedCourse;
}

export async function listMyCourses(): Promise<SavedCourse[]> {
	const sb = getSupabase();
	if (!sb) return [];

	const { data: rows, error } = await sb
		.from('courses')
		.select()
		.eq('creator_token', getCreatorToken())
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('listMyCourses:', error);
		return [];
	}
	return (rows ?? []) as SavedCourse[];
}

export async function deleteCourse(id: string): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;

	const { error } = await sb
		.from('courses')
		.delete()
		.eq('id', id);

	if (error) {
		console.error('deleteCourse:', error);
		return false;
	}
	return true;
}

// --- localStorage operations ---

const LOCAL_KEY = 'autocross-courses';
const AUTOSAVE_KEY = 'autocross-autosave';

export function saveLocal(name: string, data: CourseData): void {
	try {
		const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
		all[name] = data;
		localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
	} catch (e) {
		console.error('saveLocal:', e);
	}
}

export function loadLocal(name: string): CourseData | null {
	try {
		const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
		return all[name] ?? null;
	} catch {
		return null;
	}
}

export function listLocal(): string[] {
	try {
		return Object.keys(JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'));
	} catch {
		return [];
	}
}

export function removeLocal(name: string): void {
	try {
		const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
		delete all[name];
		localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
	} catch (e) {
		console.error('removeLocal:', e);
	}
}

export function autosave(data: CourseData): void {
	try {
		localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
	} catch (e) {
		console.error('autosave:', e);
	}
}

export function loadAutosave(): CourseData | null {
	try {
		const raw = localStorage.getItem(AUTOSAVE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function shareUrl(courseId: string): string {
	return `${window.location.origin}/course/${courseId}`;
}
