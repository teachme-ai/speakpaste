import { type } from 'arktype';
const schema = type({
		id: 'string',
		title: 'string',
		recordedAt: 'string',
		updatedAt: 'string',
		transcript: 'string',
		transcriptionStatus: "'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED'",
		'duration?': 'number | undefined',
		_v: '2',
	});

const testData = {
    id: "gECe15aOJbjx1ao3McXCB",
    title: "Recording",
    recordedAt: "2026-05-27T09:14:51.730Z",
    updatedAt: "2026-05-27T09:14:51.730Z",
    transcriptionStatus: "DONE",
    transcript: "Also, I cannot see when the pill transcribing locally gets activated.",
    _v: 2
};

const result = schema(testData);
if (result instanceof type.errors) {
    console.error(result.summary);
} else {
    console.log("Valid!");
}
