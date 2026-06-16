import axios from 'axios';

const API_BASE_URL = process.env.FIDSCRIPT_API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

export async function apiRequest(method: string, path: string, data?: any): Promise<any> {
  const response = await axios({
    method,
    url: `${API_BASE_URL}${API_PREFIX}${path}`,
    data,
    headers: {
      'Authorization': `Bearer ${process.env.FIDSCRIPT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export function handleResponse(data: any) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function handleError(error: any) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true,
  };
}