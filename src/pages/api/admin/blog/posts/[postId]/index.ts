import type { APIRoute } from 'astro';
import { BlogController } from '@server/controllers';

const controller = new BlogController();

export const GET: APIRoute = async ({ request }) => {
  return controller.execute(request);
};

export const PATCH: APIRoute = async ({ request }) => {
  return controller.execute(request);
};

export const DELETE: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
