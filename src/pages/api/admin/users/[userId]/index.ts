import type { APIRoute } from 'astro';
import { AdminController } from '@server/controllers';

const controller = new AdminController();

export const GET: APIRoute = async ({ request }) => {
  return controller.execute(request);
};

export const PATCH: APIRoute = async ({ request }) => {
  return controller.execute(request);
};

export const DELETE: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
