import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL; // e.g., "https://my-aws-api.com/api"

interface FunctionOptions {
  body?: any;
}

export const invokeFunction = async (functionName: string, options: FunctionOptions) => {
  // If we have a custom API URL, use it (AWS/Express backend)
  if (API_URL) {
    let endpoint = '';
    if (functionName === 'legal-chat') endpoint = `${API_URL}/chat`;
    if (functionName === 'voice-to-text') endpoint = `${API_URL}/voice`;

    if (!endpoint) throw new Error(`Unknown function: ${functionName}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if your AWS API requires it
        // 'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(options.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    // Handle streaming response if applicable (for chat)
    // Note: The caller handles streaming for chat separately usually.
    // This helper is for JSON responses.
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { data, error: null };
    }
    
    return { data: await response.text(), error: null };
  }

  // Fallback to Supabase Edge Functions
  return await supabase.functions.invoke(functionName, options);
};

export const getChatUrl = () => {
  if (API_URL) return `${API_URL}/chat`;
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;
};
