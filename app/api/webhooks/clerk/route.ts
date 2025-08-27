// Webhook removed - using direct user creation in API routes instead
export async function POST() {
  return new Response('Webhook endpoint disabled', { status: 404 });
}
