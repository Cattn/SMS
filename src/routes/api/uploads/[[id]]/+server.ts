import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const proxy: RequestHandler = async ({ request, params }) => {
	const headers = new Headers();
	for (const name of ['content-type', 'upload-offset']) {
		const value = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}

	try {
		const target = `http://127.0.0.1:5823/api/uploads${params.id ? `/${params.id}` : ''}`;
		const response = await fetch(target, {
			method: request.method,
			headers,
			body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
			signal: request.signal
		});
		return new Response(response.body, {
			status: response.status,
			headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
		});
	} catch (error) {
		console.error('Upload API unavailable:', error);
		return json({ error: 'Upload service is unavailable.' }, { status: 503 });
	}
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
