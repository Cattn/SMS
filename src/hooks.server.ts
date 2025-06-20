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
    const isOriginAllowed = allowedOrigins.includes(origin);

    console.log('CSRF Check:', {
        origin,
        method: request.method,
        isFormContent,
        isMutatingMethod,
        isOriginAllowed,
        allowedOrigins: allowedOrigins.slice(0, 5) // Log first 5 for reference
    });

    const forbidden = isFormContent && isMutatingMethod && !isOriginAllowed;

    if (forbidden) {
        console.log(`CSRF blocked: origin "${origin}" not in allowed origins`);
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
    csrf(event, allowedOrigins);
    return await resolve(event);
};