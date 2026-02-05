import type { APIRoute } from 'astro';
import { CronController } from '@server/controllers';

const controller = new CronController();

export const POST: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
