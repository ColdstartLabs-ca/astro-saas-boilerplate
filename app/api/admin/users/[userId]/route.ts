import { NextRequest } from 'next/server';
import { AdminController } from '@server/controllers';

const controller = new AdminController();

export async function GET(request: NextRequest, { _params }: { params: Promise<{ userId: string }> }) {
  return controller.execute(request);
}

export async function PATCH(request: NextRequest, { _params }: { params: Promise<{ userId: string }> }) {
  return controller.execute(request);
}

export async function DELETE(request: NextRequest, { _params }: { params: Promise<{ userId: string }> }) {
  return controller.execute(request);
}
