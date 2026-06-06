const CLIPBOARD_OWNER_KEY = 'mynah.clipboardOwner.v1';
const APP_OWNED_TTL_MS = 24 * 60 * 60 * 1000;

type ClipboardOwnerMarker = {
	hash: string;
	length: number;
	writtenAt: number;
	source: 'mynah';
};

const getStorage = () => {
	if (typeof localStorage === 'undefined') return null;
	return localStorage;
};

export const fingerprintClipboardText = (text: string) => {
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash.toString(16).padStart(8, '0');
};

export const rememberMynahClipboardText = (text: string) => {
	const storage = getStorage();
	if (!storage) return;

	const marker: ClipboardOwnerMarker = {
		hash: fingerprintClipboardText(text),
		length: text.length,
		writtenAt: Date.now(),
		source: 'mynah',
	};

	storage.setItem(CLIPBOARD_OWNER_KEY, JSON.stringify(marker));
};

export const isMynahOwnedClipboardText = (text: string | null) => {
	if (!text) return false;

	const storage = getStorage();
	if (!storage) return false;

	const rawMarker = storage.getItem(CLIPBOARD_OWNER_KEY);
	if (!rawMarker) return false;

	try {
		const marker = JSON.parse(rawMarker) as Partial<ClipboardOwnerMarker>;
		if (marker.source !== 'mynah') return false;
		if (typeof marker.writtenAt !== 'number') return false;
		if (Date.now() - marker.writtenAt > APP_OWNED_TTL_MS) return false;
		if (marker.length !== text.length) return false;
		return marker.hash === fingerprintClipboardText(text);
	} catch {
		return false;
	}
};
