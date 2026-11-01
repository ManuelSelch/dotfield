import { compileProject, type CompilerDiagnostic } from './compiler';
import { cloneProject, parseProject } from './format';
import type { BotProject } from './types';
type Reader = Pick<Storage, 'getItem'>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const projectKey = (enemy: string) => `dotfield.bot-project.v1.${encodeURIComponent(enemy)}`;
export interface StoredProject {
  project: BotProject | null;
  token: string | null;
  recovery: boolean;
  error?: string;
}
export function readEnemyProject(enemy: string, storage?: Reader): StoredProject {
  let token: string | null;
  try {
    token = (storage ?? window.localStorage).getItem(projectKey(enemy));
  } catch {
    return {
      project: null,
      token: null,
      recovery: false,
      error: 'Local storage is unavailable. Your draft can be edited, but Save may not work.',
    };
  }
  if (token === null) return { project: null, token, recovery: false };
  try {
    const project = parseProject(token),
      checked = compileProject(project);
    if (!checked.ok) throw new Error(checked.diagnostics[0]?.message ?? 'Invalid project.');
    return { project, token, recovery: false };
  } catch (error) {
    return {
      project: null,
      token,
      recovery: true,
      error: `Saved project cannot be loaded: ${error instanceof Error ? error.message : 'unsupported source'}. It has not been changed.`,
    };
  }
}
export type SaveResult =
  | { ok: true; project: BotProject; token: string }
  | { ok: false; error: string; diagnostics?: CompilerDiagnostic[] };
/** One atomic key per enemy, editable source only. Check-and-write also protects
 * a concurrent Home tab and unreadable/unknown versions from silent overwrite.
 */
export function saveEnemyProject(
  enemy: string,
  input: unknown,
  options: { expected: string | null; replaceUnreadable?: boolean },
  storage?: Store,
): SaveResult {
  const checked = compileProject(input);
  if (!checked.ok)
    return {
      ok: false,
      error: 'Fix the draft errors before saving. Last saved project is unchanged.',
      diagnostics: checked.diagnostics,
    };
  try {
    const store = storage ?? window.localStorage,
      current = readEnemyProject(enemy, store);
    if (current.error && !current.recovery) return { ok: false, error: current.error };
    if (current.token !== options.expected)
      return {
        ok: false,
        error:
          'The saved project changed in another tab. Nothing was overwritten. Review your changes before reopening: reopening loads the newer save and discards this draft.',
      };
    if (current.recovery && !options.replaceUnreadable)
      return {
        ok: false,
        error:
          'The saved project is unreadable or unsupported. Explicitly confirm replacement before saving.',
      };
    const project = cloneProject(input),
      token = JSON.stringify(project);
    store.setItem(projectKey(enemy), token);
    return { ok: true, project, token };
  } catch {
    return {
      ok: false,
      error:
        'Could not save: local storage is unavailable or full. Your working draft and last saved project are unchanged.',
    };
  }
}
