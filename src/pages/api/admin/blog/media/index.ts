import type { APIRoute } from 'astro';
import { BlogController } from '@server/controllers';

const controller = new BlogController();

export const GET: APIRoute = async ({ request }) => {
  return controller.execute(request);
};

export const POST: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
