import { type Handle } from "@sveltejs/kit";

// Temporarily commented out for testing
// import { allowedOrigins } from "$lib/config";

// Temporarily commented out CSRF function for testing
/*
const csrf = (
    event: RequestEvent,
    allowedOrigins: string[],
) => {
    // ... CSRF logic temporarily disabled
};

function isContentType(request: Request, ...types: string[]) {
    const type = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
    return types.includes(type.toLowerCase());
}
function isFormContentType(request: Request) {
    return isContentType(
        request,
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
    );
}
*/


export const handle: Handle = async ({ event, resolve }) => {
    console.log(`=== HOOKS.SERVER.TS ===`);
    console.log(`${event.request.method} ${event.url.pathname}`);
    console.log(`Headers:`, Object.fromEntries(event.request.headers.entries()));
    
    // Completely disable CSRF for all requests temporarily
    console.log('Skipping all CSRF checks for testing');
    
    return await resolve(event);
};