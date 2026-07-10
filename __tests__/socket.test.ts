jest.mock('@/lib/http', () => ({ getWebSocketBaseURL: () => 'wss://flow.example.com' }));

import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';

describe('websocket utilities', () => {
  it('builds authenticated websocket URLs safely', () => {
    expect(buildWebSocketUrl('/ws/notifications/', 'a token')).toBe('wss://flow.example.com/ws/notifications/?token=a%20token');
    expect(buildWebSocketUrl('ws/call/room/?mode=video', 'jwt')).toBe('wss://flow.example.com/ws/call/room/?mode=video&token=jwt');
  });

  it('uses bounded exponential reconnect delays', () => {
    expect(reconnectDelay(0)).toBe(1000);
    expect(reconnectDelay(3)).toBe(8000);
    expect(reconnectDelay(20)).toBe(30000);
  });
});
