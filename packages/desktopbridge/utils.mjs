import { invoke } from '@tauri-apps/api/core';

export const Invoke = invoke;
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
