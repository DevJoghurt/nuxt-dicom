import WebSocket from 'ws'

const serviceName = 'storeScp_1'
const url = `ws://localhost:3000/ws/dicom/logs/${serviceName}`

console.log(`Connecting to ${url}`)

const ws = new WebSocket(url)

ws.on('open', () => {
  console.log('WebSocket connected')
  // Send identify message
  ws.send(JSON.stringify({
    type: 'identify',
    serviceName,
  }))
})

ws.on('message', (message) => {
  console.log('Message received:', message.toString())
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})

ws.on('close', () => {
  console.log('WebSocket closed')
  process.exit(0)
})

setTimeout(() => {
  console.log('Timeout, closing connection')
  ws.close()
}, 5000)
