export function cleanWhisperHallucinations(text: string): string {
	let cleaned = text.trim();
	if (!cleaned) return cleaned;

	// List of common trailing Whisper hallucinations as regular expressions.
	// We match them at the end of the text, case-insensitive, with optional punctuation.
	const trailingHallucinations = [
		/\b(thank\s+you(?:\s+for\s+watching|\s+very\s+much)?)\b[.!?,]*$/i,
		/\b(thanks(?:\s+for\s+watching)?)\b[.!?,]*$/i,
		/\b(subtitled\s+by|subtitles\s+by)\b.*?$/i,
		/\b(goodbye|bye\s+bye|bye)\b[.!?,]*$/i,
		/\b(see\s+you\s+next\s+time|go\s+next\s+time)\b[.!?,]*$/i,
		// Avoid stripping legitimate short words if they represent the entire speech.
		// So we only strip trailing single-word artifacts if there is other content before them.
		/(?<=\S\s+)\b(you|yeah|okay|watching)\b[.!?,]*$/i,
	];

	let modified = true;
	while (modified) {
		modified = false;
		for (const regex of trailingHallucinations) {
			if (regex.test(cleaned)) {
				const next = cleaned.replace(regex, '').trim();
				// If we end up with empty text, keep the original short utterance intact.
				if (next !== cleaned && next.length > 0) {
					cleaned = next;
					modified = true;
				}
			}
		}
	}

	return collapseRepeatedTrailingClause(cleaned);
}

function collapseRepeatedTrailingClause(text: string): string {
	const clauses = text
		.split(/(?<=[.!?])\s+/)
		.map((clause) => clause.trim())
		.filter(Boolean);

	if (clauses.length < 2) return text;

	const last = normalizeClause(clauses.at(-1) ?? '');
	const previous = normalizeClause(clauses.at(-2) ?? '');
	if (!last || !previous) return text;

	if (last === previous) {
		return clauses.slice(0, -1).join(' ').trim();
	}

	return text;
}

function normalizeClause(clause: string): string {
	return clause
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
}
