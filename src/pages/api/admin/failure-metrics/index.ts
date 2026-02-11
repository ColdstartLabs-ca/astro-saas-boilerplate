import type { APIRoute } from 'astro';
import { AdminController } from '@server/controllers';

const controller = new AdminController();

export const GET: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
