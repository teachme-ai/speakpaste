import { describe, expect, test } from 'bun:test';
import {
	routeAndFormat,
	parseModeCommand,
	cleanRamble,
	formatList,
	formatPrompt,
	type WritingMode,
} from './intent-router';

// ── 50-Fixture Strategy Test Suite ───────────────────────────────────────────

const cleanRambleFixtures = [
	// Standard stutter/filler removals
	{ input: 'i went to the store um and bought some apples', expected: 'I went to the store and bought some apples' },
	{ input: 'uh what was i saying err yes the report is done', expected: 'What was i saying yes the report is done' },
	{ input: 'i went to the store the store and bought bought some apples', expected: 'I went to the store and bought some apples' },
	// Cross-punctuation duplicate test (must not collapse)
	{ input: 'Yes. Yes. I will do it.', expected: 'Yes. Yes. I will do it.' },
	{ input: 'No, no, no.', expected: 'No, no, no.' },
	// Guarded filler deletion (like, actually)
	{ input: 'I like pizza.', expected: 'I like pizza.' }, // mid-clause, must stay
	{ input: 'Actually, he went to the office.', expected: 'He went to the office.' }, // clause-initial
	{ input: 'He, like, decided to wait.', expected: 'He, like, decided to wait.' }, // mid-clause
	{ input: 'It was, actually, a very nice day.', expected: 'It was, a very nice day.' }, // comma-sandwiched
	{ input: 'She went to the park, actually.', expected: 'She went to the park.' }, // trailing clause boundary
	{ input: 'Like, you know, it was fine.', expected: 'You know, it was fine.' }, // clause-initial
	// Spoken punctuation conversions
	{ input: 'hello period this is a test comma and then some more', expected: 'Hello. This is a test, and then some more' },
	{ input: 'this is a sentence period', expected: 'This is a sentence.' },
];

const listFixtures = [
	// Tier 1: Explicit inline ordinals
	{ input: '1. First item 2. Second item 3. Third item', expected: '- First item\n- Second item\n- Third item' },
	{ input: 'First, buy apples, second, get milk, finally, clean up', expected: '- Buy apples\n- Get milk\n- Clean up' },
	// Tier 2: Explicit bullet lines
	{ input: '* Apples\n* Bananas\n* Oranges', expected: '- Apples\n- Bananas\n- Oranges' },
	{ input: '- item one\n- item two', expected: '- Item one\n- Item two' },
	// Tier 3: Guarded inference
	{ input: 'grocery list: apples, bananas, and oranges', expected: 'grocery list:\n- Apples\n- Bananas\n- And oranges' },
	{ input: 'I need to do: wash the car, buy groceries, pay the bills', expected: 'I need to do:\n- Wash the car\n- Buy groceries\n- Pay the bills' },
	// Gated failure fallbacks (no intro stem or too long or too few items)
	{ input: 'auth and retention and billing', expected: 'Auth and retention and billing' }, // LS-06: no intro stem -> fallback
	{ input: 'Johnson and Johnson and Pfizer', expected: 'Johnson and Johnson and Pfizer' }, // LS-11: no intro stem -> fallback
	{ input: 'I need to: this is a very long item that exceeds the maximum word count constraint because it goes on and on and on, second item, third item', expected: 'I need to: this is a very long item that exceeds the maximum word count constraint because it goes on and on and on, second item, third item' }, // item > 12 words -> fallback
];

const promptFixtures = [
	// Thin input rule: bypass templates for short text
	{ input: 'explain transformers simply', expected: 'explain transformers simply' }, // PR-02: thin input -> verbatim
	{ input: 'draft a short email', expected: 'draft a short email' },
	// Cue-phrase extraction
	{
		input: 'task: write a rust script context: for file processing constraints: no unsafe code format: print to stdout',
		expected: '### Task\nwrite a rust script\n\n### Context\nfor file processing\n\n### Constraints\nno unsafe code\n\n### Format\nprint to stdout',
	},
	{
		input: 'constraints: output only json format: minified task: parse a log line',
		expected: '### Task\nparse a log line\n\n### Constraints\noutput only json\n\n### Format\nminified',
	},
	{
		input: 'task: implement sorting algorithm context: array of integers',
		expected: '### Task\nimplement sorting algorithm\n\n### Context\narray of integers',
	},
	// Meta-framing stripping
	{ input: 'write a prompt to explain transformers simply', expected: 'explain transformers simply' },
	{ input: 'please create a prompt that explains quantum computing', expected: 'explains quantum computing' },
	{
		input: 'write a prompt: task: explain quantum physics context: for a 5 year old',
		expected: '### Task\nexplain quantum physics\n\n### Context\nfor a 5 year old',
	},
];

describe('🎙️ Intent Router Strategy & Formatters', () => {
	// ── CleanRamble Formatter Tests ──
	describe('CleanRamble Formatter', () => {
		for (const [idx, f] of cleanRambleFixtures.entries()) {
			test(`fixture CR-${idx + 1}: "${f.input.substring(0, 30)}"`, () => {
				expect(cleanRamble(f.input)).toBe(f.expected);
			});
		}
	});

	// ── List Formatter Tests ──
	describe('List Formatter', () => {
		for (const [idx, f] of listFixtures.entries()) {
			test(`fixture LS-${idx + 1}: "${f.input.substring(0, 30)}"`, () => {
				expect(formatList(f.input)).toBe(f.expected);
			});
		}
		test('explicit list formatting splits by periods and commas', () => {
			expect(formatList('buy milk. eggs. bread.', true)).toBe('- Buy milk\n- Eggs\n- Bread');
			expect(formatList('Buy milk. Eggs. Bread.', true)).toBe('- Buy milk\n- Eggs\n- Bread');
			expect(formatList('grocery list: apples, bananas, and oranges.', true)).toBe('- Apples\n- Bananas\n- And oranges');
			expect(formatList('grocery list: apples, bananas, and oranges.', false)).toBe('grocery list:\n- Apples\n- Bananas\n- And oranges');
		});
	});

	// ── Prompt Formatter Tests ──
	describe('Prompt Formatter', () => {
		for (const [idx, f] of promptFixtures.entries()) {
			test(`fixture PR-${idx + 1}: "${f.input.substring(0, 30)}"`, () => {
				expect(formatPrompt(f.input)).toBe(f.expected);
			});
		}
	});

	// ── Spoken Override Command Parser Tests ──
	describe('parseModeCommand (Spoken Override Parser)', () => {
		test('prefix checks', () => {
			expect(parseModeCommand('please clean this up: standard dictation')).toEqual({
				mode: 'clean_ramble',
				residual: 'standard dictation',
			});
			expect(parseModeCommand('please clean this up, so I went to the store')).toEqual({
				mode: 'clean_ramble',
				residual: 'so I went to the store',
			});
			expect(parseModeCommand('please clean this up. so I went to the store')).toEqual({
				mode: 'clean_ramble',
				residual: 'so I went to the store',
			});
			expect(parseModeCommand('hey mynah, list: apples, oranges, bananas')).toEqual({
				mode: 'list',
				residual: 'apples, oranges, bananas',
			});
			expect(parseModeCommand('make a prompt: explain regex')).toEqual({
				mode: 'prompt',
				residual: 'explain regex',
			});
		});

		test('suffix checks', () => {
			expect(parseModeCommand('buy milk, eggs, bread as a list')).toEqual({
				mode: 'list',
				residual: 'buy milk, eggs, bread',
			});
			expect(parseModeCommand('buy milk, eggs, bread as a list.')).toEqual({
				mode: 'list',
				residual: 'buy milk, eggs, bread',
			});
			expect(parseModeCommand('explain transformers simply as a prompt please')).toEqual({
				mode: 'prompt',
				residual: 'explain transformers simply',
			});
			expect(parseModeCommand('explain transformers simply as a prompt please!')).toEqual({
				mode: 'prompt',
				residual: 'explain transformers simply',
			});
		});

		test('false positive protection', () => {
			// "list" used in natural sentence must not override
			expect(parseModeCommand('please put it on the list for tomorrow')).toBeNull();
			expect(parseModeCommand('I put it on the list')).toBeNull();
			// "prompt" used in natural sentence must not override
			expect(parseModeCommand('the prompt engineering course was great')).toBeNull();
			// Bare suffix with no residual must fail-open to raw
			expect(parseModeCommand('as a list')).toBeNull();
		});
	});

	// ── Main routing and format logic tests ──
	describe('routeAndFormat', () => {
		test('Dictate Mode verbatim bypass when voiceOverrideEnabled is false', () => {
			const rawText = 'please clean this up: apples, oranges as a list';
			const res = routeAndFormat(rawText, 'dictate', false);
			expect(res.text).toBe(rawText);
			expect(res.modeApplied).toBe('dictate');
			expect(res.passthrough).toBe(true);
		});

		test('Dictate Mode allows voice overrides when voiceOverrideEnabled is true', () => {
			const rawText = 'please clean this up: so i went to the the store um';
			const res = routeAndFormat(rawText, 'dictate', true);
			expect(res.text).toBe('So i went to the store');
			expect(res.modeApplied).toBe('clean_ramble');
			expect(res.passthrough).toBe(false);
		});

		test('Voice overrides are parsed under non-dictate modes', () => {
			const res = routeAndFormat('list: apples, bananas, oranges', 'clean_ramble', true);
			expect(res.text).toBe('- Apples\n- Bananas\n- Oranges');
			expect(res.modeApplied).toBe('list');
			expect(res.passthrough).toBe(false);
		});

		test('Bypasses voice override if voiceOverrideEnabled is false', () => {
			const rawText = 'list: apples, bananas, oranges';
			const res = routeAndFormat(rawText, 'clean_ramble', false);
			// Under clean_ramble, list: prefix matches cleanRamble but isn't stripped as a command
			expect(res.text).toBe('List: apples, bananas, oranges');
			expect(res.modeApplied).toBe('clean_ramble');
			expect(res.passthrough).toBe(false);
		});

		test('Empty-residual fallback fail-open to rawText', () => {
			// Case A: Formatted override residual yields empty output
			const rawText1 = 'please clean this up um uh';
			const res1 = routeAndFormat(rawText1, 'clean_ramble', true);
			expect(res1.text).toBe(rawText1);
			expect(res1.passthrough).toBe(false);

			// Case B: Dictate override residual is empty (bare command)
			const rawText2 = 'just dictate mode:';
			const res2 = routeAndFormat(rawText2, 'clean_ramble', true);
			expect(res2.text).toBe(rawText2);
			expect(res2.modeApplied).toBe('dictate');
			expect(res2.passthrough).toBe(true);
		});
	});

	// ── Idempotency Invariant f(f(x)) === f(x) ──
	describe('Idempotency Property Invariant f(f(x)) === f(x)', () => {
		test('idempotency property across all suite inputs', () => {
			const allInputs = [
				...cleanRambleFixtures.map((f) => f.input),
				...listFixtures.map((f) => f.input),
				...promptFixtures.map((f) => f.input),
				'please clean this up: standard dictation',
				'hey mynah, list: apples, oranges, bananas',
				'make a prompt: explain regex',
				'buy milk, eggs, bread as a list',
				'explain transformers simply as a prompt please',
				'please put it on the list for tomorrow',
				'the prompt engineering course was great',
				'as a list',
				'please clean this up um uh',
				'list: apples, bananas, oranges',
			];

			for (const x of allInputs) {
				// 1. clean_ramble mode idempotency
				const crOnce = cleanRamble(x);
				const crTwice = cleanRamble(crOnce);
				expect(crTwice).toBe(crOnce);

				// 2. list mode idempotency
				const listOnce = formatList(x);
				const listTwice = formatList(listOnce);
				expect(listTwice).toBe(listOnce);

				// 3. prompt mode idempotency
				const promptOnce = formatPrompt(x);
				const promptTwice = formatPrompt(promptOnce);
				expect(promptTwice).toBe(promptOnce);
			}
		});
	});

	// ── Persistence split assertion test ──
	describe('Persistence Guard Split Wiring Contract', () => {
		test('wiring contract: rawText vs shapedText divergence', () => {
			const rawText = 'please clean this up: so i went to the the store um';
			
			// Mock settings values
			const activeMode: WritingMode = 'clean_ramble';
			const voiceOverrideEnabled = true;

			// Run routeAndFormat (pipeline's router stage)
			const shapedResult = routeAndFormat(rawText, activeMode, voiceOverrideEnabled);

			// Delivery gets shaped text:
			const deliveryInput = shapedResult.text;
			// Database/Yjs gets raw text:
			const persistenceInput = rawText;

			// Verify divergence
			expect(deliveryInput).toBe('So i went to the store');
			expect(persistenceInput).toBe('please clean this up: so i went to the the store um');
			expect(deliveryInput).not.toBe(persistenceInput);
		});
	});
});
