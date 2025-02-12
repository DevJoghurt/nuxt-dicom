/**
 * StoreSCPEventHandler
 * @param data
 */
type StoreSCPEventHandler = (data: string) => void

/**
 * StoreSCPEvent
 * @param OnFileStored - Triggered when a file is stored
 * @param OnStudyCompleted - Triggered when a study is completed
 */
type StoreSCPEvent = 'OnFileStored' | 'OnStudyCompleted'

/**
 * StoreSCPEventListener
 * @param handler
 */
type StoreSCPEventListener = (event: StoreSCPEvent, handler: StoreSCPEventHandler) => void

type StoreSCPEventInstance = {
  event: StoreSCPEvent
  handler: StoreSCPEventHandler
}

const storeSCPEventListener: StoreSCPEventInstance[] = []

/**
 * Add a handler to the storeSCPEventListener, triggered when a file is stored
 * @param event
 * @param handler
 */
export const addStoreSCPEventListener: StoreSCPEventListener = (event, handler) => {
  storeSCPEventListener.push({ event, handler })
}

export const getStoreSCPEventListener = () => {
  return storeSCPEventListener
}
