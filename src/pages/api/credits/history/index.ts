import type { APIRoute } from 'astro';
import { CreditsController } from '@server/controllers';

const controller = new CreditsController();

export const GET: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
