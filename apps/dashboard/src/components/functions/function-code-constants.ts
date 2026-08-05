// Map runtime identifiers to Monaco language ids
export const RUNTIME_LANG: Record<string, string> = {
  nodejs18: 'javascript',
  nodejs20: 'javascript',
  nodejs22: 'javascript',
  python311: 'python',
  python312: 'python',
  go: 'go',
  rust: 'rust',
};

export const STARTER_CODE: Record<string, string> = {
  nodejs20: `// FIDScript Edge Function
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
  python311: `# FIDScript Edge Function
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
  go: `// FIDScript Edge Function
package main
func Handler(event []byte, env map[string]string) (map[string]interface{}, error) {
    return map[string]interface{}{
        "message":   "Hello from FIDScript Edge!",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
    }, nil
}
`,
  rust: `// FIDScript Edge Function
#[tokio::main]
async fn handler(event: Value, _env: &Env) -> Result<Value, Error> {
    Ok(json!({
        "message": "Hello from FIDScript Edge!",
        "timestamp": Utc::now().to_rfc3339(),
    }))
}
`,
  default: '// Your function code here\n',
};

export function getStarterCode(runtime: string): string {
  return STARTER_CODE[runtime] ?? STARTER_CODE['default'];
}
