import type { Peer } from 'crossws'
import { defineWebSocketHandler, dicomLogger } from '#imports'

// Extend Peer type for storage
interface PeerWithStorage extends Peer {
  _serviceName?: string
  _unsubscribe?: () => void
}

/**
 * Helper to extract service name from URL path
 */
function extractServiceName(path: string | undefined): string {
  if (!path) return 'unknown'
  try {
    // Path format: /ws/dicom/logs/:serviceName
    const parts = path.split('/').filter(p => p)
    const logsIndex = parts.indexOf('logs')
    if (logsIndex >= 0 && logsIndex < parts.length - 1) {
      return parts[logsIndex + 1]
    }
    return parts[parts.length - 1] || 'unknown'
  }
  catch {
    return 'unknown'
  }
}

/**
 * WebSocket handler for live service logs
 * Route: ws://localhost:3000/ws/dicom/logs/:serviceName
 */
export default defineWebSocketHandler({
  async open(peer: Peer, event: any) {
    const peerStorage = peer as PeerWithStorage

    // Initial serviceName from URL (fallback to unknown if not accessible)
    let serviceName = 'unknown'
    try {
      let url: string | undefined

      if ('url' in peer && typeof (peer as any).url === 'string') {
        url = (peer as any).url
      }
      else if ('url' in peer && typeof (peer as any).url === 'object' && (peer as any).url?.pathname) {
        url = (peer as any).url.pathname
      }
      else if (event) {
        url = event.node?.req?.url || event.node?.req?.originalUrl || event.url
      }

      if (url) {
        serviceName = extractServiceName(url)
      }
    }
    catch (err) {
      console.error('[WebSocket] Error extracting serviceName:', err)
    }

    // Store for cleanup in close/error handlers
    peerStorage._serviceName = serviceName

    dicomLogger.debug(peerStorage._serviceName, 'WebSocket client connected')

    // Send initial logs to new subscriber
    const recentLogs = dicomLogger.getRecentLogs(peerStorage._serviceName, 100)
    for (const entry of recentLogs) {
      peer.send(
        JSON.stringify({
          type: 'log',
          entry: {
            timestamp: entry.timestamp.toISOString(),
            serviceName: entry.serviceName,
            level: entry.level,
            message: entry.message,
            metadata: entry.metadata,
          },
        }),
      )
    }
    peer.send(JSON.stringify({ type: 'ready' }))

    // Subscribe to new logs for this service and broadcast to peer
    const unsubscribe = dicomLogger.subscribe(peerStorage._serviceName, (entry) => {
      try {
        peer.send(
          JSON.stringify({
            type: 'log',
            entry: {
              timestamp: entry.timestamp.toISOString(),
              serviceName: entry.serviceName,
              level: entry.level,
              message: entry.message,
              metadata: entry.metadata,
            },
          }),
        )
      }
      catch (error) {
        console.error('Error sending log to WebSocket peer:', error)
      }
    })

    // Store unsubscribe function on peer for cleanup
    peerStorage._unsubscribe = unsubscribe
  },

  message(peer: Peer, message: any, event?: any) {
    const peerStorage = peer as PeerWithStorage
    let serviceName = peerStorage._serviceName || 'unknown'
    const text = message.text()

    try {
      const data = JSON.parse(text)

      // Client can send identify message with service name
      if (data.type === 'identify' && data.serviceName) {
        const newServiceName = data.serviceName

        // If service name is different, update subscription
        if (newServiceName !== serviceName) {
          dicomLogger.debug(newServiceName, `WebSocket re-subscribing from ${serviceName} to ${newServiceName}`)

          // Unsubscribe from old service if there was one
          const oldUnsubscribe = peerStorage._unsubscribe
          if (oldUnsubscribe) {
            oldUnsubscribe()
          }

          // Subscribe to new service
          const newUnsubscribe = dicomLogger.subscribe(newServiceName, (entry) => {
            try {
              peer.send(
                JSON.stringify({
                  type: 'log',
                  entry: {
                    timestamp: entry.timestamp.toISOString(),
                    serviceName: entry.serviceName,
                    level: entry.level,
                    message: entry.message,
                    metadata: entry.metadata,
                  },
                }),
              )
            }
            catch (error) {
              console.error('Error sending log to WebSocket peer:', error)
            }
          })
          peerStorage._unsubscribe = newUnsubscribe
        }

        peerStorage._serviceName = newServiceName
        serviceName = newServiceName

        // Send recent logs for this service
        const recentLogs = dicomLogger.getRecentLogs(serviceName, 100)
        for (const entry of recentLogs) {
          peer.send(
            JSON.stringify({
              type: 'log',
              entry: {
                timestamp: entry.timestamp.toISOString(),
                serviceName: entry.serviceName,
                level: entry.level,
                message: entry.message,
                metadata: entry.metadata,
              },
            }),
          )
        }
        return
      }

      if (data.type === 'ping') {
        peer.send(JSON.stringify({ type: 'pong' }))
      }
    }
    catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  },

  close(peer: Peer, event?: any) {
    const peerStorage = peer as PeerWithStorage
    const serviceName = peerStorage._serviceName || 'unknown'
    dicomLogger.debug(serviceName, 'WebSocket client disconnected')

    // Cleanup subscription
    const unsubscribe = peerStorage._unsubscribe
    if (unsubscribe) {
      unsubscribe()
    }
  },

  error(peer: Peer, error: any, event?: any) {
    const peerStorage = peer as PeerWithStorage
    const serviceName = peerStorage._serviceName || 'unknown'
    dicomLogger.error(serviceName, `WebSocket error: ${error.message}`)
  },
})
