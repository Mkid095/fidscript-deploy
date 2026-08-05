// Starter code snippets surfaced the first time a user opens the editor for
// a function with no deployed version. Each snippet matches the runtime
// family accepted by FN-01.
export const STARTER_CODE: Record<string, string> = {
  nodejs: `// FIDScript Edge Function
export async function handler(event) {
  const { request, env } = event;

  console.log('Event:', JSON.stringify(event, null, 2));

  return Response.json({
    message: 'Hello from FIDScript Edge!',
    timestamp: new Date().toISOString(),
    functionId: env.FUNCTION_ID,
  });
}
`,
  python: `# FIDScript Edge Function
def handler(event, env):
    print(f"Event: {event}")

    return {
        "statusCode": 200,
        "body": {
            "message": "Hello from FIDScript Edge!",
            "timestamp": datetime.utcnow().isoformat(),
        }
    }
`,
};

const DEFAULT_STARTER = '// Your function code here\n';

export function getStarterCode(runtime: string): string {
  return STARTER_CODE[runtime] ?? DEFAULT_STARTER;
}