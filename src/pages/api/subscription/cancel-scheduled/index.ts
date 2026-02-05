import type { APIRoute } from 'astro';
import { SubscriptionController } from '@server/controllers';

const controller = new SubscriptionController();

export const POST: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
