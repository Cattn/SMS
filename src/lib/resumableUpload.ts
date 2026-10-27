const CHUNK_SIZE = 8 * 1024 * 1024;
const STALL_TIMEOUT = 30_000;
const MAX_RETRY_DELAY = 15_000;

export interface UploadOptions {
	uploadPath?: string;
	expiresIn?: string;
	expiresAt?: string;
}

export interface UploadProgress {
	loaded: number;
	total: number;
	speed: number;
	eta: number | null;
	reconnecting: boolean;
}

export interface UploadResult {
	filename: string;
	uploadPath: string;
	expiresAt?: string;
}

class UploadError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly offset?: number
	) {
		super(message);
	}
}

const isFatal = (error: unknown) =>
	error instanceof UploadError && error.status >= 400 && error.status < 500 && error.status !== 409;

async function request(url: string, init?: RequestInit) {
	const response = await fetch(url, init);
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw new UploadError(body.error ?? 'Upload failed', response.status);
	return body;
}

function sendChunk(
	id: string,
	file: File,
	offset: number,
	onBytes: (loaded: number) => void,
	signal: AbortSignal
): Promise<{ offset: number } & Partial<UploadResult>> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		let stallTimer: ReturnType<typeof setTimeout>;
		const resetStall = () => {
			clearTimeout(stallTimer);
			stallTimer = setTimeout(() => xhr.abort(), STALL_TIMEOUT);
		};
		const abort = () => xhr.abort();

		xhr.open('PATCH', `/api/uploads/${id}`);
		xhr.setRequestHeader('content-type', 'application/offset+octet-stream');
		xhr.setRequestHeader('upload-offset', String(offset));
		xhr.upload.onprogress = (event) => {
			resetStall();
			onBytes(offset + event.loaded);
		};
		xhr.upload.onload = () => clearTimeout(stallTimer);
		xhr.onloadend = () => {
			clearTimeout(stallTimer);
			signal.removeEventListener('abort', abort);
		};
		xhr.onload = () => {
			let body: Record<string, unknown> = {};
			try {
				body = JSON.parse(xhr.responseText);
			} catch {
				void 0;
			}
			if (xhr.status === 200) resolve(body as { offset: number });
			else
				reject(
					new UploadError(
						String(body.error ?? 'Upload failed'),
						xhr.status,
						body.offset as number | undefined
					)
				);
		};
		xhr.onerror = xhr.onabort = () => reject(new UploadError('Connection lost', 0));

		signal.addEventListener('abort', abort);
		resetStall();
		xhr.send(file.slice(offset, offset + CHUNK_SIZE));
	});
}

function waitForRetry(attempt: number, signal: AbortSignal) {
	const delay = Math.min(MAX_RETRY_DELAY, 1000 * 2 ** attempt);
	return new Promise<void>((resolve) => {
		const done = () => {
			clearTimeout(timer);
			window.removeEventListener('online', done);
			signal.removeEventListener('abort', done);
			resolve();
		};
		const timer = setTimeout(done, navigator.onLine ? delay : 60_000);
		window.addEventListener('online', done);
		signal.addEventListener('abort', done);
	});
}

export async function resumableUpload(
	file: File,
	options: UploadOptions,
	onProgress: (progress: UploadProgress) => void,
	signal: AbortSignal
): Promise<UploadResult> {
	const key = `sms-upload:${options.uploadPath ?? ''}:${file.name}:${file.size}:${file.lastModified}`;
	let id = localStorage.getItem(key);
	let offset = 0;
	let reconnecting = false;

	let speed = 0;
	let sample = { time: performance.now(), bytes: 0 };
	const report = (loaded: number) => {
		const now = performance.now();
		const elapsed = (now - sample.time) / 1000;
		if (elapsed >= 0.5) {
			const current = Math.max(0, loaded - sample.bytes) / elapsed;
			speed = speed ? speed * 0.7 + current * 0.3 : current;
			sample = { time: now, bytes: loaded };
		}
		onProgress({
			loaded,
			total: file.size,
			speed,
			eta: speed > 0 ? (file.size - loaded) / speed : null,
			reconnecting
		});
	};

	if (id) {
		try {
			offset = (await request(`/api/uploads/${id}`, { signal })).offset;
		} catch {
			id = null;
		}
	}
	if (!id) {
		const session = await request('/api/uploads', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ filename: file.name, size: file.size, ...options }),
			signal
		});
		id = session.id as string;
		localStorage.setItem(key, id);
	}
	sample.bytes = offset;
	report(offset);

	for (let attempt = 0; ;) {
		try {
			const result = await sendChunk(
				id,
				file,
				offset,
				(loaded) => {
					reconnecting = false;
					report(loaded);
				},
				signal
			);
			offset = result.offset;
			attempt = 0;
			if (result.filename) {
				localStorage.removeItem(key);
				report(file.size);
				return result as UploadResult;
			}
		} catch (error) {
			if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
			if (isFatal(error)) {
				if ((error as UploadError).status === 404) localStorage.removeItem(key);
				throw error;
			}

			reconnecting = true;
			report(offset);
			await waitForRetry(attempt++, signal);
			if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');

			try {
				offset =
					(error as UploadError).offset ?? (await request(`/api/uploads/${id}`, { signal })).offset;
				speed = 0;
				sample = { time: performance.now(), bytes: offset };
			} catch (statusError) {
				if (isFatal(statusError)) {
					localStorage.removeItem(key);
					throw statusError;
				}
			}
		}
	}
}
