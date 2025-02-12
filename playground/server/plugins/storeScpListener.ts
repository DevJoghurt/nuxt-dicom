export default defineNitroPlugin(async () => {
  addStoreSCPEventListener('OnStudyCompleted', (data) => {
    console.log('Study received in listener', data)
  })
})
