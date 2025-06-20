import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
        console.log(event.url.protocol + '//' + event.url.hostname + ':5823/api/upload');
        const formData = await event.request.formData();
        const response = await fetch(event.url.protocol + '//' + event.url.hostname + ':5823/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log(data);
        return { success: true };
    }
} satisfies Actions;