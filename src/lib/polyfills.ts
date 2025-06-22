// I doubt this works... but idk

if (!globalThis.crypto) {
	globalThis.crypto = {} as Crypto;
}

if (!globalThis.crypto.randomUUID) {
	globalThis.crypto.randomUUID = function randomUUID() {
		if (globalThis.crypto.getRandomValues) {
			const bytes = new Uint8Array(16);
			globalThis.crypto.getRandomValues(bytes);

			bytes[6] = (bytes[6] & 0x0f) | 0x40;
			bytes[8] = (bytes[8] & 0x3f) | 0x80;

			const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
			return [
				hex.slice(0, 8),
				hex.slice(8, 12),
				hex.slice(12, 16),
				hex.slice(16, 20),
				hex.slice(20, 32)
			].join('-') as `${string}-${string}-${string}-${string}-${string}`;
		} else {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				const r = (Math.random() * 16) | 0;
				const v = c === 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}) as `${string}-${string}-${string}-${string}-${string}`;
		}
	};
}
