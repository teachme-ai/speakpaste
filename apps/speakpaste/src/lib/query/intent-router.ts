import { invoke } from '@tauri-apps/api/core';

export type WritingMode = 'dictate' | 'clean_ramble' | 'list' | 'prompt';

export type RouteAndFormatResult = {
	text: string;
	modeApplied: WritingMode;
	/**
	 * True if no formatting or shaping was attempted (e.g., in Dictate mode).
	 * False if formatting/shaping was executed, even if the text remained unchanged
	 * or fell back to raw due to empty residual or failure.
	 */
	passthrough: boolean;
};

export type ParsedCommand = {
	mode: WritingMode;
	residual: string;
};

// ── Command Parser Regex Constants ───────────────────────────────────────────

const POLITE = '(?:(?:hey\\s+)?mynah[\\s,]+)?(?:please\\s+|can\\s+you\\s+|could\\s+you\\s+|would\\s+you\\s+|i\\s+want\\s+(?:you\\s+)?to\\s+|i\\s+need\\s+(?:you\\s+)?to\\s+)?';
const VERB = '(?:make\\s+(?:this|it)\\s+|turn\\s+(?:this|it)\\s+into\\s+|format\\s+(?:this|it)\\s+as\\s+|write\\s+(?:this|it)\\s+as\\s+|give\\s+me\\s+)?';
const SEP = '(?:\\s*[,;\\.\\-—:]\\s*|\\s+)';

type ModeMatcher = {
	mode: WritingMode;
	prefix: RegExp;
	suffix: RegExp;
};

let matchersCache: ModeMatcher[] | null = null;

function getMatchers(): ModeMatcher[] {
	if (matchersCache) return matchersCache;

	const prefix = (keyword: string) =>
		new RegExp(`^${POLITE}${VERB}(?:${keyword})${SEP}(.*)$`, 'i');

	const suffix = (keyword: string) =>
		new RegExp(
			`^(.*?)(?:(?:\\s*[,;:\\-—]\\s*)(?:as\\s+a\\s+|in\\s+|as\\s+)?|\\s+(?:as\\s+a\\s+|in\\s+|as\\s+))(?:${keyword})(?:\\s+(?:mode|please|thanks))?\\s*[\\.\\?!]*\\s*$`,
			'i',
		);

	matchersCache = [
		{
			mode: 'dictate',
			prefix: prefix('just\\s+dictate\\s+mode|dictate\\s+mode|word[\\s\\-]for[\\s\\-]word|raw\\s+text|just\\s+dictate|dictate|verbatim'),
			suffix: suffix('word[\\s\\-]for[\\s\\-]word|dictate\\s+mode|verbatim|dictated'),
		},
		{
			mode: 'clean_ramble',
			prefix: prefix(
				'clean\\s+ramble\\s+mode|clean\\s+this\\s+up|clean\\s+it\\s+up|tidy\\s+this\\s+up|tidy\\s+it\\s+up|fix\\s+this\\s+up|fix\\s+it\\s+up|polish\\s+this|polish\\s+it|clean\\s+ramble|clean\\s+mode|tidy\\s+up|polish|clean',
			),
			suffix: suffix('clean\\s+ramble\\s+mode|clean\\s+ramble|cleaned\\s+up|tidied\\s+up|polished'),
		},
		{
			mode: 'list',
			prefix: prefix(
				'bulleted\\s+list|numbered\\s+list|bullet\\s+points\\s+list|bullet\\s+point\\s+list|make\\s+a\\s+list|list\\s+mode|bullet\\s+points|bullet\\s+point|bullets|list',
			),
			suffix: suffix('numbered\\s+list|list\\s+mode|bullet\\s+points|a\\s+list|bullets|list'),
		},
		{
			mode: 'prompt',
			prefix: prefix('make\\s+a\\s+prompt|as\\s+a\\s+prompt|prompt\\s+mode|prompt'),
			suffix: suffix('prompt\\s+mode|a\\s+prompt|prompt'),
		},
	];

	return matchersCache;
}

// ── Spoken Mode Command Parser ───────────────────────────────────────────────

const STOP_WORDS = new Set(['as', 'in', 'a', 'an', 'the', 'please', 'hey', 'mynah', 'just']);

/**
 * Parses a transcript for an explicit spoken mode directive at the start or end.
 * Returns ParsedCommand if detected, null otherwise.
 */
export function parseModeCommand(transcript: string): ParsedCommand | null {
	const trimmed = transcript.trim();
	if (!trimmed) return null;

	const matchers = getMatchers();

	// Prefix pass (preferred)
	for (const m of matchers) {
		const match = trimmed.match(m.prefix);
		if (match) {
			return {
				mode: m.mode,
				residual: (match[1] || '').trim(),
			};
		}
	}

	// Suffix pass (requires non-empty residual to prevent content loss)
	for (const m of matchers) {
		const match = trimmed.match(m.suffix);
		if (match) {
			const residual = (match[1] || '').trim();
			if (residual.length > 0 && !STOP_WORDS.has(residual.toLowerCase())) {
				return {
					mode: m.mode,
					residual,
				};
			}
		}
	}

	return null;
}

// ── Deterministic Formatters ──────────────────────────────────────────────────

function capitalize(s: string): string {
	if (!s) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const REPEATABLE_WORDS = new Set([
	'the', 'a', 'an', 'to', 'in', 'on', 'at', 'it', 'that', 'this', 'there', 'here',
	'i', 'you', 'he', 'she', 'we', 'they', 'go', 'went', 'want', 'think', 'know',
	'say', 'store', 'house', 'car', 'do', 'have', 'get', 'make', 'would', 'will',
	'can', 'clean', 'up', 'ramble', 'and', 'but', 'or', 'about'
]);

/**
 * Clean Ramble Mode: Cleans stutters, filler words, and consecutive duplicates.
 */
export function cleanRamble(text: string): string {
	const trimmed = text.trim();
	if (!trimmed) return '';

	// 1. Remove stutters/fillers: uh, um, ah, err
	let cleaned = trimmed.replace(/\b(uh|um|ah|err)\b,?\s*/gi, '');

	// 2. Guarded fillers: like, actually
	// Clause-initial (start of string or after sentence punctuation)
	cleaned = cleaned.replace(/(^|[\.\?!;:\-—]\s+)(like|actually)\b,?\s*/gi, '$1');
	// Comma-sandwiched (e.g. ", actually,")
	cleaned = cleaned.replace(/,\s*actually\s*,/gi, ',');
	// Trailing clause boundary
	cleaned = cleaned.replace(/,\s*actually\b/gi, '');

	// 3. Collapse consecutive duplicate words/phrases (excluding across punctuation)
	let prev;
	do {
		prev = cleaned;
		// Collapse two-word phrase duplicates: "the store the store" -> "the store"
		// Guard against A and A / A or A idioms (e.g. "on and on", "Johnson and Johnson")
		cleaned = cleaned.replace(/\b([a-z]+)\s+([a-z]+)\s+\1\s+\2\b/gi, (match, w1, w2) => {
			const lw1 = w1.toLowerCase();
			const lw2 = w2.toLowerCase();
			if (
				REPEATABLE_WORDS.has(lw1) &&
				REPEATABLE_WORDS.has(lw2) &&
				lw2 !== 'and' &&
				lw2 !== 'or' &&
				lw2 !== 'by'
			) {
				return `${w1} ${w2}`;
			}
			return match;
		});
		// Collapse single-word duplicates: "bought bought" -> "bought"
		cleaned = cleaned.replace(/\b([a-z]+)\s+\1\b/gi, '$1');
	} while (cleaned !== prev);

	return cleaned.trim();
}

/**
 * List Mode: Formats items into bulleted lists using a three-tier rule.
 */
export function formatList(text: string, forceList = false): string {
	const trimmed = text.trim();
	if (!trimmed) return '';

	// Tier 1: Explicit bullet markers (Checked first to support list idempotency)
	const lines = trimmed.split('\n');
	const hasBulletLine = lines.some(line => /^\s*[\*\-•]\s+/.test(line));
	if (hasBulletLine) {
		return lines.map(line => {
			const m = line.match(/^\s*[\*\-•]\s+(.*)$/);
			if (m && m[1] !== undefined) {
				return `- ${capitalize(m[1].trim())}`;
			}
			return line;
		}).join('\n');
	}

	// Tier 2: Explicit ordinals (e.g., "1. First item 2. Second item")
	const numberedPattern = /(?:\b\d+[\.\)]\s+)/g;
	const matches = trimmed.match(numberedPattern);
	if (matches && matches.length >= 2) {
		const items = trimmed.split(/(?:\b\d+[\.\)]\s+)/).map(s => s.trim().replace(/^,\s*|,\s*$/g, '').trim()).filter(Boolean);
		if (items.length >= 2) {
			return items.map(item => `- ${capitalize(item)}`).join('\n');
		}
	}

	// Word ordinals (firstly, secondly, first, second)
	const ordinalPattern = /\b(?:first|firstly|second|secondly|third|thirdly|fourth|fourthly|finally|lastly)\b/i;
	if (ordinalPattern.test(trimmed)) {
		const items = trimmed.split(/\b(?:first|firstly|second|secondly|third|thirdly|fourth|fourthly|finally|lastly)[,\s]*/i)
			.map(s => s.trim().replace(/^,\s*|,\s*$/g, '').trim())
			.filter(Boolean);
		const allShort = items.every(item => item.split(/\s+/).length <= 12);
		if (items.length >= 2 && allShort) {
			return items.map(item => `- ${capitalize(item)}`).join('\n');
		}
	}

	// Tier 3: Guarded inference / Explicit List mode
	let introStem = '';
	let listBody = trimmed;
	const colonIndex = trimmed.indexOf(':');
	if (colonIndex !== -1) {
		introStem = trimmed.slice(0, colonIndex + 1).trim();
		listBody = trimmed.slice(colonIndex + 1).trim();
	}

	if (forceList || introStem) {
		const rawItems = listBody.split(/[,;\n]|\.(?=\s|$)/).map(s => s.trim()).filter(Boolean);
		const allShort = rawItems.every(item => item.split(/\s+/).length <= 12);
		if (forceList || (rawItems.length >= 3 && allShort)) {
			const listItems = rawItems.map(item => `- ${capitalize(item)}`).join('\n');
			
			if (introStem && !forceList) {
				return `${introStem}\n${listItems}`;
			}
			return listItems;
		}
	}

	// Fallback to CleanRamble if List inference fails
	return cleanRamble(trimmed);
}

/**
 * Prompt Mode: Wraps text into a developer prompt template.
 */
export function formatPrompt(text: string): string {
	const trimmed = text.trim();
	if (!trimmed) return '';

	// Idempotency check: if already formatted as a prompt, return verbatim
	if (trimmed.startsWith('### Task') || trimmed.startsWith('### Context')) {
		return trimmed;
	}

	const words = trimmed.split(/\s+/);
	const hasCues = /task:|context:|constraint|format:/i.test(trimmed);

	// Thin input rule: bypass template for short inputs with no cue phrases
	if (words.length < 15 && !hasCues) {
		return trimmed;
	}

	let task = '';
	let context = '';
	let constraints = '';
	let format = '';

	const sectionRegex = /(task:|context:|constraints:|format:)/i;
	const parts = trimmed.split(sectionRegex);

	if (parts.length > 1) {
		const p0 = parts[0];
		task = p0 ? p0.trim() : '';
		for (let i = 1; i < parts.length; i += 2) {
			const cue = parts[i];
			const nextPart = parts[i + 1];
			if (cue) {
				const lowerCue = cue.toLowerCase();
				const content = nextPart ? nextPart.trim() : '';
				if (lowerCue.includes('task')) {
					task = content;
				} else if (lowerCue.includes('context')) {
					context = content;
				} else if (lowerCue.includes('constraint')) {
					constraints = content;
				} else if (lowerCue.includes('format')) {
					format = content;
				}
			}
		}
	} else {
		task = trimmed;
	}

	let result = '';
	if (task) {
		result += `### Task\n${task}\n\n`;
	}
	if (context) {
		result += `### Context\n${context}\n\n`;
	}
	if (constraints) {
		result += `### Constraints\n${constraints}\n\n`;
	}
	if (format) {
		result += `### Format\n${format}\n\n`;
	}

	return result.trim();
}

// ── Main Routing Logic ────────────────────────────────────────────────────────

/**
 * Formats a raw transcript based on the active mode and optional voice overrides.
 */
export function routeAndFormat(
	rawText: string,
	activeMode: WritingMode,
	voiceOverrideEnabled: boolean,
): RouteAndFormatResult {
	const trimmed = rawText.trim();
	if (!trimmed) {
		return { text: '', modeApplied: activeMode, passthrough: true };
	}

	// 1. Check for spoken voice override if enabled (checked first so it can override any active mode, including dictate)
	if (voiceOverrideEnabled) {
		const parsed = parseModeCommand(trimmed);
		if (parsed) {
			// If override dictates, bypass formatting
			if (parsed.mode === 'dictate') {
				if (!parsed.residual.trim()) {
					return { text: rawText, modeApplied: 'dictate', passthrough: true };
				}
				return { text: parsed.residual, modeApplied: 'dictate', passthrough: true };
			}

			// Apply requested formatting to residual (forcing List if explicit)
			let formattedResidual = '';
			switch (parsed.mode) {
				case 'clean_ramble':
					formattedResidual = cleanRamble(parsed.residual);
					break;
				case 'list':
					formattedResidual = formatList(parsed.residual, true);
					break;
				case 'prompt':
					formattedResidual = formatPrompt(parsed.residual);
					break;
			}

			// Fail-open guard: if formatting residual yields empty output, deliver original rawText
			if (!formattedResidual.trim()) {
				return { text: rawText, modeApplied: parsed.mode, passthrough: false };
			}

			return { text: formattedResidual, modeApplied: parsed.mode, passthrough: false };
		}
	}

	// 2. Dictate Mode: byte-identical passthrough, no voice override matched/processed
	if (activeMode === 'dictate') {
		return { text: rawText, modeApplied: 'dictate', passthrough: true };
	}

	// 3. Apply active mode formatting to the full text
	let formatted = '';
	switch (activeMode) {
		case 'clean_ramble':
			formatted = cleanRamble(trimmed);
			break;
		case 'list':
			formatted = formatList(trimmed, true);
			break;
		case 'prompt':
			formatted = formatPrompt(trimmed);
			break;
	}

	return { text: formatted, modeApplied: activeMode, passthrough: false };
}
