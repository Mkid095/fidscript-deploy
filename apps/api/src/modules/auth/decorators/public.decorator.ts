import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'fidscript:public';

/**
 * Mark a route as public.
 *
 * The platform's authorization is **default-deny**: a route is protected
 * unless it says otherwise. Before this, a controller that simply forgot a
 * guard was public — and there were twelve such controllers, among them the
 * mail webhooks and the Cloudflare OAuth callback, which is how an
 * anonymous caller could configure the platform or take over a tenant's DNS.
 *
 * A route is public when it is *meant* to be:
 *
 *  - a health or metrics probe,
 *  - a webhook, which carries its own signature,
 *  - a link, whose token IS the credential,
 *  - the setup routes, which carry the setup token.
 *
 * Everything else needs a caller.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
