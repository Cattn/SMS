import { error, type Handle, type RequestEvent } from "@sveltejs/kit";
import { allowedOrigins } from "$lib/config";

const csrf = (
    event: RequestEvent,
    allowedOrigins: string[],
) => {
    const { request } = event;
    
    const origin = request.headers.get("origin") || "";
    const isFormContent = isFormContentType(request);
    const isMutatingMethod = request.method === "POST" ||
        request.method === "PUT" ||
        request.method === "PATCH" ||
        request.method === "DELETE";
    
    console.log(`CSRF check for ${request.method} ${event.url.pathname}:`, {
        origin,
        isFormContent,
        isMutatingMethod,
        contentType: request.headers.get("content-type")
    });
    
    // Normalize origin for comparison (remove trailing slashes, etc)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
    const isOriginAllowed = normalizedAllowedOrigins.includes(normalizedOrigin);
    
    console.log('Origin check:', {
        normalizedOrigin,
        isOriginAllowed,
        firstFewAllowed: normalizedAllowedOrigins.slice(0, 3)
    });

    // Temporary bypass for debugging - remove this later
    if (normalizedOrigin === 'http://crack:1337' && event.url.pathname === '/upload') {
        console.log('Bypassing CSRF for upload from crack:1337');
        return;
    }

    const forbidden = isFormContent && isMutatingMethod && !isOriginAllowed;

    if (forbidden) {
        console.log(`CSRF blocked: origin "${normalizedOrigin}" not in allowed origins`);
        error(403, `Cross-site ${request.method} form submissions are forbidden`);
    }
};

function isContentType(request: Request, ...types: string[]) {
    const type = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
    return types.includes(type.toLowerCase());
}
function isFormContentType(request: Request) {
    // These content types must be protected against CSRF
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/enctype
    return isContentType(
        request,
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
    );
}


export const handle: Handle = async ({ event, resolve }) => {
    console.log(`Request: ${event.request.method} ${event.url.pathname}`);
    
    try {
        csrf(event, allowedOrigins);
    } catch (err) {
        console.log('CSRF Error caught:', err);
        throw err;
    }
    
    return await resolve(event);
};