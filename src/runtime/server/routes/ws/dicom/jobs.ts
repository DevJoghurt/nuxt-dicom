import type { Peer } from 'crossws'
import { defineWebSocketHandler, storeSCUJobManager, dicomRetrieveJobManager } from '#imports'

interface PeerWithUnsub extends Peer {
  _unsubscribe?: () => void
}

/**
 * WebSocket handler for live job progress
 * Route: ws://localhost:3000/ws/dicom/jobs
 *
 * Protocol (server → client):
 *   { type: 'snapshot', jobs: Array<StoreSCUJob | DicomRetrieveJob> }  – sent once on connect
 *   { type: 'update',   job:  StoreSCUJob | DicomRetrieveJob }         – sent on every state change
 *
 * Protocol (client → server):
 *   { type: 'ping' }  →  { type: 'pong' }
 */
export default defineWebSocketHandler({
  open(peer: Peer) {
    const p = peer as PeerWithUnsub

    // Send initial snapshot of all current jobs (both Store-SCU and PACS retrieve)
    const snapshot = [
      ...storeSCUJobManager.getAllJobs(),
      ...dicomRetrieveJobManager.getAllJobs(),
    ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    peer.send(JSON.stringify({ type: 'snapshot', jobs: snapshot }))

    // Subscribe to every subsequent job mutation from both managers
    const unsubStore = storeSCUJobManager.subscribeAll((job) => {
      try { peer.send(JSON.stringify({ type: 'update', job })) }
      catch { /* peer may have disconnected */ }
    })
    const unsubRetrieve = dicomRetrieveJobManager.subscribeAll((job) => {
      try { peer.send(JSON.stringify({ type: 'update', job })) }
      catch { /* peer may have disconnected */ }
    })

    p._unsubscribe = () => {
      unsubStore()
      unsubRetrieve()
    }
  },

  message(peer: Peer, message: { text: () => string }) {
    try {
      const data = JSON.parse(message.text())
      if (data.type === 'ping') {
        peer.send(JSON.stringify({ type: 'pong' }))
      }
    }
    catch {
      // ignore malformed messages
    }
  },

  close(peer: Peer) {
    const p = peer as PeerWithUnsub
    p._unsubscribe?.()
  },

  error(peer: Peer) {
    const p = peer as PeerWithUnsub
    p._unsubscribe?.()
  },
})
