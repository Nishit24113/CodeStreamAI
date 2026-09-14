const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CodeVersion {
  version: number;
  timestamp: number;
  userId: string;
  codePreview: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface ChatMessage {
  timestamp: number;
  userId: string;
  username: string;
  message: string;
}

// Code Management
export async function saveCode(roomId: string, code: string, language: string, userId: string = 'anonymous') {
  const response = await fetch(`${API_URL}/code/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId,
      code,
      language,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save code');
  }

  return await response.json();
}

export async function loadCode(roomId: string) {
  const response = await fetch(`${API_URL}/code/load/${roomId}`, {
    method: 'GET',
  });

  if (response.status === 404) {
    return null; // Room doesn't exist yet
  }

  if (!response.ok) {
    throw new Error('Failed to load code');
  }

  return await response.json();
}

export async function getVersionHistory(roomId: string): Promise<CodeVersion[]> {
  const response = await fetch(`${API_URL}/code/versions/${roomId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get version history');
  }

  const data = await response.json();
  return data.versions || [];
}

// Code Execution
export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  // Route to correct Lambda based on language
  const endpoint = (language === 'javascript' || language === 'js')
    ? '/code/execute-js'
    : '/code/execute';

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute code');
  }

  return await response.json();
}

// Chat
export async function sendChatMessage(roomId: string, message: string, userId: string, username: string) {
  const response = await fetch(`${API_URL}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId,
      message,
      userId,
      username,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return await response.json();
}

export async function getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
  const response = await fetch(`${API_URL}/chat/${roomId}?limit=${limit}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get chat history');
  }

  const data = await response.json();
  return data.messages || [];
}

// Admin
export async function deleteRoom(roomId: string) {
  const response = await fetch(`${API_URL}/code/${roomId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete room');
  }

  return await response.json();
}
