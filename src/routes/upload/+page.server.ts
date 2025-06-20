import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
        console.log('=== UPLOAD ACTION STARTED ===');
        console.log('Upload action called with:', {
            method: event.request.method,
            url: event.url.href,
            origin: event.request.headers.get('origin'),
            contentType: event.request.headers.get('content-type')
        });
        
        console.log('Fetching to: http://' + event.url.hostname + ':5823/api/upload');
        
        try {
            const formData = await event.request.formData();
            console.log('Form data received, forwarding to API...');
            
            const response = await fetch('http://' + event.url.hostname + ':5823/api/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('API response status:', response.status);
            const data = await response.json();
            console.log('API response data:', data);
            
            return { success: true, data };
        } catch (error) {
            console.error('Upload action error:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
} satisfies Actions;