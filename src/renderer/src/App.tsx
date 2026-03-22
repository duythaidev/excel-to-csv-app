import { JSX, useState } from 'react'
import { stringify } from 'csv-stringify/browser/esm/sync'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0

function App(): JSX.Element {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [sheetData, setSheetData] = useState<Record<string, any[][]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [exportingSheet, setExportingSheet] = useState<string | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const selectFile = async () => {
    const result = await window.api.openFileDialog()
    if (result.canceled) return

    const path = result.filePaths[0]
    setFilePath(path)
    setIsLoading(true)
    setSheets([])
    setSheetData({})

    const excel = await window.api.readExcel(path)

    if (excel.error) {
      addToast('Lỗi đọc file: ' + excel.error, 'error')
      setIsLoading(false)
      return
    }

    setSheets(excel.sheetNames)
    setSheetData(excel.dataMap)
    setIsLoading(false)
    addToast(`Đã đọc ${excel.sheetNames.length} sheet thành công`, 'success')
  }

  const downloadSingle = async (sheetName: string) => {
    const data = sheetData[sheetName]
    if (!data) return

    setExportingSheet(sheetName)

    const csvContent = stringify(data, {
      header: true,
      quoted: true,
      delimiter: ','
    })

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sheetName.replace(/[^a-z0-9]/gi, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)

    setTimeout(() => setExportingSheet(null), 800)
    addToast(`Đã xuất "${sheetName}.csv"`, 'success')
  }

  const exportAll = async () => {
    if (sheets.length === 0) return

    const result = await window.api.openFolderDialog()
    if (result.canceled || !result.filePaths.length) return

    setIsExportingAll(true)
    const outputDir = result.filePaths[0]
    let successCount = 0

    for (const sheetName of sheets) {
      const data = sheetData[sheetName]
      if (!data) continue

      const [header, ...rows] = data
      const csvContent = stringify(rows, { header: true, columns: header })
      const safeName = sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const fp = `${outputDir}/${safeName}.csv`

      try {
        await window.api.writeFile(fp, '\uFEFF' + csvContent)
        successCount++
      } catch (e) {
        console.error(`Lỗi ghi ${sheetName}:`, e)
      }
    }

    setIsExportingAll(false)
    if (successCount === sheets.length) {
      addToast(`✓ Đã xuất tất cả ${successCount} file CSV`, 'success')
    } else {
      addToast(`Đã xuất ${successCount}/${sheets.length} file (có lỗi xảy ra)`, 'error')
    }
  }

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null

  return (
    <>
      <div className="app">
        <div className="header">
          <div className="header-eyebrow">Công cụ chuyển đổi</div>
          <h1>Excel → CSV Converter</h1>
          <p>
            Chọn file .xlsx để chuyển đổi từng sheet hoặc toàn bộ sang định dạng CSV chuẩn UTF-8.
          </p>
        </div>

        {!filePath ? (
          <div className="drop-zone" onClick={selectFile}>
            <div className="drop-icon">📂</div>
            <div className="drop-label">Nhấp để chọn file Excel</div>
            <div className="drop-sub">.xlsx · .xls</div>
          </div>
        ) : (
          <>
            <div className="file-pill">
              <span className="file-pill-icon">📄</span>
              <span className="file-pill-name">{fileName}</span>
            </div>
            <button className="btn btn-select" onClick={selectFile}>
              <span>📂</span> Chọn file khác
            </button>
          </>
        )}

        {isLoading && (
          <div className="loading-bar">
            <div className="loading-bar-inner" />
          </div>
        )}

        {sheets.length > 0 && (
          <>
            <div className="divider" />

            <div className="section-header">
              <span className="section-label">Danh sách sheet</span>
              <span className="section-count">{sheets.length} sheets</span>
            </div>

            <div className="sheet-list">
              {sheets.map((name, i) => {
                const rowCount = sheetData[name]?.length ?? 0
                const isExporting = exportingSheet === name
                return (
                  <div className="sheet-row" key={name}>
                    <div className="sheet-row-left">
                      <span className="sheet-index">{String(i + 1).padStart(2, '0')}</span>
                      <span className="sheet-name">{name}</span>
                      {rowCount > 0 && (
                        <span className="sheet-rows-count">{rowCount.toLocaleString()} rows</span>
                      )}
                    </div>
                    <button
                      className={`btn btn-ghost ${isExporting ? 'exporting' : ''}`}
                      onClick={() => downloadSingle(name)}
                      disabled={isExporting || isExportingAll}
                    >
                      {isExporting ? (
                        <>
                          <div className="spinner" /> Đang xuất
                        </>
                      ) : (
                        <>↓ CSV</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              className="btn btn-primary"
              onClick={exportAll}
              disabled={isExportingAll || sheets.length === 0}
            >
              {isExportingAll ? (
                <>
                  <div
                    className="spinner"
                    style={{ borderTopColor: '#000', borderColor: 'rgba(0,0,0,0.3)' }}
                  />
                  Đang xuất tất cả...
                </>
              ) : (
                <>↓ Xuất tất cả → Chọn thư mục</>
              )}
            </button>
          </>
        )}
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
