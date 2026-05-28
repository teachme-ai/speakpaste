/**
 * Attach a desktop-only materializer that mirrors the `recordings` table into
 * `{id}.md` files on disk. No-op in the browser.
 *
 * Observes the table and invokes Tauri Rust commands (`write_markdown_files`,
 * `delete_files_in_directory`) through a serialized promise chain so rapid
 * changes never produce overlapping writes.
 */

import type { MaybePromise, Table } from '@epicenter/workspace';
import { invoke, isTauri } from '@tauri-apps/api/core';
import yaml from 'js-yaml';
import type * as Y from 'yjs';
import type { Recording } from './workspace';

type RecordingMarkdownFilesAttachment = {
	/** Resolves after the initial flush of existing rows completes. */
	whenFlushed: Promise<void>;
	/** Resolves after the Y.Doc is destroyed and the write queue drains. */
	whenDisposed: Promise<void>;
};

/**
 * Serialize a recording row to a markdown file.
 *
 * Puts `transcript` in the body and all other metadata in YAML frontmatter.
 * Strips `_v` (workspace internal, not useful in human-readable files).
 */
function toRecordingMarkdownFile(row: Recording) {
	const { transcript, _v, ...frontmatter } = row;
	const yamlStr = yaml.dump(frontmatter, { lineWidth: -1 });
	return {
		filename: `${row.id}.md`,
		content: `---\n${yamlStr}---\n${transcript || ''}\n`,
	};
}

export function attachRecordingMarkdownFiles(
	ydoc: Y.Doc,
	recordings: Table<Recording>,
	config: {
		dir: MaybePromise<string>;
		whenReady: Promise<unknown>;
	},
): RecordingMarkdownFilesAttachment {
	if (!isTauri()) {
		return {
			whenFlushed: Promise.resolve(),
			whenDisposed: Promise.resolve(),
		};
	}

	// Serialized promise chain — observer batches complete sequentially so
	// rapid changes don't produce overlapping Rust invoke calls.
	let syncQueue = Promise.resolve();
	const dirPromise = Promise.resolve(config.dir);

	const unsubscribe = recordings.observe((changedIds) => {
		syncQueue = syncQueue
			.then(async () => {
				const dir = await dirPromise;
				const toWrite: { filename: string; content: string }[] = [];
				const toDelete: string[] = [];

				for (const id of changedIds) {
					const { data: row, error } = recordings.get(id);
					if (error) continue; // invalid row — leave existing file alone
					if (row === null) {
						toDelete.push(`${id}.md`);
					} else {
						toWrite.push(toRecordingMarkdownFile(row));
					}
				}

				if (toWrite.length) {
					await invoke('write_markdown_files', { directory: dir, files: toWrite });
				}
				if (toDelete.length) {
					await invoke('delete_files_in_directory', {
						directory: dir,
						filenames: toDelete,
					});
				}
			})
			.catch((error) => {
				console.warn('[recording-materializer] write failed:', error);
			});
	});

	const whenFlushed = (async () => {
		await config.whenReady;
		syncQueue = syncQueue.then(async () => {
			const dir = await dirPromise;
			
			// Hydrate from FS to Yjs
			try {
				const { readDir, readTextFile, join } = await import('@tauri-apps/plugin-fs');
				const entries = await readDir(dir).catch(() => []);
				const mdFiles = entries.filter((e) => e.name?.endsWith('.md'));
				
				for (const mdFile of mdFiles) {
					try {
						const path = await join(dir, mdFile.name!);
						const content = await readTextFile(path);
						const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
						if (match) {
							const frontmatter = yaml.load(match[1]) as any;
							if (frontmatter && frontmatter.id) {
								if (frontmatter.recordedAt instanceof Date) frontmatter.recordedAt = frontmatter.recordedAt.toISOString();
								if (frontmatter.updatedAt instanceof Date) frontmatter.updatedAt = frontmatter.updatedAt.toISOString();
								if (!frontmatter.title) frontmatter.title = 'Recording';
								if (!frontmatter.transcriptionStatus) frontmatter.transcriptionStatus = 'DONE';
								frontmatter.transcript = match[2].trim();
								const existing = recordings.get(frontmatter.id);
								if (!existing?.data) {
									// Load missing record from disk into memory
									recordings.set({ ...frontmatter, _v: 2 } as Recording);
								}
							}
						}
					} catch (e) {
						console.error(`[recording-materializer] Failed to load ${mdFile.name}:`, e);
					}
				}
			} catch (e) {
				console.error('[recording-materializer] Hydration failed:', e);
			}

			const files = recordings.getAllValid().map(toRecordingMarkdownFile);
			if (files.length) {
				await invoke('write_markdown_files', { directory: dir, files });
			}
		});
		await syncQueue;
	})();

	const { promise: whenDisposed, resolve: resolveDisposed } =
		Promise.withResolvers<void>();

	ydoc.once('destroy', () => {
		unsubscribe();
		void syncQueue.finally(() => resolveDisposed());
	});

	return { whenFlushed, whenDisposed };
}
