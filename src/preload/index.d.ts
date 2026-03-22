import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<{
        canceled: boolean
        filePaths: string[]
      }>

      openFolderDialog: () => Promise<{
        canceled: boolean
        filePaths: string[]
      }>

      readExcel: (filePath: string) => Promise<any>

      writeFile: (path: string, content: string) => void
    }
  }
}
