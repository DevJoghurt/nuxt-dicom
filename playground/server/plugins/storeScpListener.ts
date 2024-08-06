export default defineNitroPlugin(async () => {
  addStoreSCPEventListener((data) => {
    console.log('File received in listener', data)
  })
})
