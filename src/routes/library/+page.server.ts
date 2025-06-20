import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		files: await fetch(url.protocol + '//' + url.hostname + ':5823/api/getFiles').then(res => res.json())
	};
};	