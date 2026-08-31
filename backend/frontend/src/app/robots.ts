import { MetadataRoute } from 'next';
import adminConfig from '../../admin_config.json';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        `/${adminConfig.admin_route_slug}/`,
        `/${adminConfig.admin_route_slug}`,
        '/api/admin/',
        '/api/admin'
      ],
    },
  };
}
