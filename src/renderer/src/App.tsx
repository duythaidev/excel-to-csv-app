import { useState } from 'react'
import { stringify } from 'csv-stringify/browser/esm/sync' // hoặc dùng async nếu file lớn

function App() {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [sheetData, setSheetData] = useState<Record<string, any[][]>>({}) // lưu data từng sheet
  const [status, setStatus] = useState<string>('')

  // Hàm chọn file bằng dialog (native, đẹp hơn <input type="file">)
  const selectFile = async () => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return

    const path = result.filePaths[0]
    setFilePath(path)
    setStatus('Đang đọc...')

    const excel = await window.api.readExcel(path)

    if (excel.error) {
      setStatus('Lỗi: ' + excel.error)
      return
    }

    setSheets(excel.sheetNames)
    setSheetData(excel.dataMap)
    setStatus(`Đã đọc ${excel.sheetNames.length} sheet`)
  }

  // Download 1 file CSV riêng
  const downloadSingle = (sheetName: string) => {
    const data = sheetData[sheetName]
    if (!data) return

    const csvContent = stringify(data, {
      header: true,
      quoted: true,
      delimiter: ','
    })

    // Thêm UTF-8 BOM để Excel mở đúng tiếng Việt
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sheetName.replace(/[^a-z0-9]/gi, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Export tất cả → chọn folder
  const exportAll = async () => {
    if (sheets.length === 0) return

    const result = await window.api.openFolderDialog()

    if (result.canceled || !result.filePaths.length) {
      setStatus('Đã hủy export all')
      return
    }

    const outputDir = result.filePaths[0]
    let successCount = 0

    for (const sheetName of sheets) {
      const data = sheetData[sheetName]
      if (!data) continue

      // 🚀 Tách header + rows
      const [header, ...rows] = data

      const csvContent = stringify(rows, {
        header: true,
        columns: header
      })

      const safeName = sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const filePath = `${outputDir}/${safeName}.csv`

      try {
        await window.api.writeFile(filePath, '\uFEFF' + csvContent)
        successCount++
      } catch (e) {
        console.error(`Lỗi ghi ${sheetName}:`, e)
      }
    }

    setStatus(`Đã lưu ${successCount}/${sheets.length} file CSV vào ${outputDir}`)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1>Excel → CSV Converter</h1>

      <button
        onClick={selectFile}
        style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '20px' }}
      >
        Chọn file Excel (.xlsx)
      </button>

      {filePath && <p>File: {filePath}</p>}
      {status && <p style={{ color: status.includes('Lỗi') ? 'red' : 'green' }}>{status}</p>}

      {sheets.length > 0 && (
        <>
          <h3>Danh sách sheet (CSV):</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sheets.map((name) => (
              <li key={name} style={{ margin: '10px 0' }}>
                <strong>{name}</strong>{' '}
                <button
                  onClick={() => downloadSingle(name)}
                  style={{ marginLeft: '15px', padding: '6px 12px' }}
                >
                  Download CSV
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={exportAll}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Export All CSV → Chọn thư mục
          </button>
        </>
      )}
    </div>
  )
}

export default App
