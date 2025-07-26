import React, { useState } from 'react';
import { SwingReplayer } from '../src/react';

// Mock session data - in real usage, this would come from your backend
const mockSessionEvents = [
  {
    type: 0, // full snapshot
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 1,
            tagName: 'html',
            childNodes: [
              {
                type: 1,
                tagName: 'head',
                childNodes: []
              },
              {
                type: 1,
                tagName: 'body',
                childNodes: [
                  {
                    type: 1,
                    tagName: 'div',
                    id: 'app',
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'Hello World'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    timestamp: Date.now()
  }
];

export function ReplayDemo() {
  const [events, setEvents] = useState(mockSessionEvents);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleLoadSession = async () => {
    // In a real app, you would fetch session events from your backend
    // const response = await fetch('/api/sessions/123/events');
    // const sessionEvents = await response.json();
    // setEvents(sessionEvents);
    
    console.log('Loading session events...');
    setEvents(mockSessionEvents);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Swing Session Replay Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleLoadSession}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Load Session
        </button>
      </div>

      {events.length > 0 && (
        <div>
          <h3>Session Replay</h3>
          <p>Events loaded: {events.length}</p>
          
          <SwingReplayer
            events={events}
            width={800}
            height={600}
            style={{
              border: '2px solid #ddd',
              borderRadius: '8px',
              marginTop: '10px'
            }}
          />
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h4>How to use in your app:</h4>
        <ol>
          <li>Fetch session events from your backend API</li>
          <li>Pass the events array to SwingReplayer</li>
          <li>The component will automatically render the session replay</li>
        </ol>
        
        <h4>Example API call:</h4>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`// Fetch session events
const response = await fetch('/api/sessions/\${sessionId}/events');
const events = await response.json();

// Use in component
<SwingReplayer events={events} width={1200} height={800} />`}
        </pre>
      </div>
    </div>
  );
} 