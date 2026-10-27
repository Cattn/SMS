import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const headers = new Headers();
	for (const name of ['content-type', 'content-length']) {
		const value = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}

	try {
		const options: RequestInit & { duplex: 'half' } = {
			method: 'POST',
			headers,
			body: request.body,
			signal: request.signal,
			duplex: 'half'
		};
		const response = await fetch('http://127.0.0.1:5823/api/upload', options);
		return new Response(response.body, {
			status: response.status,
			headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
		});
	} catch (error) {
		console.error('Upload API unavailable:', error);
		return json(
			{ error: 'Upload service is unavailable. Please try again later.' },
			{ status: 503 }
		);
	}
};
