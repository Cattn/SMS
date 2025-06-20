import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
        console.log('http://' + event.url.hostname + ':5823/api/upload');
        const formData = await event.request.formData();
        const response = await fetch('http://' + event.url.hostname + ':5823/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', errorText);
            return { success: false, error: errorText };
        }
        
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }
        
        console.log(data);
        return { success: true, data };
    }
} satisfies Actions;