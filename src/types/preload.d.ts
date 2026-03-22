export {}

declare global {
  interface Window {
    api: {
      openFileDialog: () => Promise<{
        canceled: boolean
        filePaths: string[]
      }>
      openFolderDialog: () => Promise<{
        canceled: boolean
        filePaths: string[]
      }>
    }
  }
}
