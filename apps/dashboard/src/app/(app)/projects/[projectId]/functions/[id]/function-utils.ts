export function getStarterCode(runtime: string): string {
  switch (runtime) {
    case 'node':
      return `// FIDScript Edge Function\nexport async function handler(event) {\n  const { request, env } = event;\n  return Response.json({\n    message: 'Hello from FIDScript',\n    timestamp: new Date().toISOString(),\n  });\n}\n`;
    case 'python':
      return `# FIDScript Edge Function\ndef handler(event, env):\n    return {\n        "statusCode": 200,\n        "body": {"message": "Hello from FIDScript"}\n    }\n`;
    default:
      return '// Your function code here\n';
  }
}
