/**
 * StoreSCPEventHandler
 * @param data
 */
type StoreSCPEventHandler = (data: string) => void

/**
 * StoreSCPEventListener
 * @param handler
 */
type StoreSCPEventListener = (handler: StoreSCPEventHandler) => void

const storeSCPEventListener: StoreSCPEventHandler[] = []

/**
 * Add a handler to the storeSCPEventListener, triggered when a file is stored
 * @param handler
 */
export const addStoreSCPEventListener: StoreSCPEventListener = (handler) => {
  storeSCPEventListener.push(handler)
}

export const getStoreSCPEventListener = () => {
  return storeSCPEventListener
}
