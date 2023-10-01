import { useState, useEffect } from "react"
import { WebR } from "webr"
import { readCSV, runMetaAnalysis } from "./lib/r-functions"
import { ForestPlot } from "./components/ForestPlot"
import { ComboboxDemo } from "./components/multi-select"

const webR = new WebR()

function App() {
  const [status, setStatus] = useState("Loading webR...")

  useEffect(() => {
    ;(async () => {
      await webR.init()

      //setStatus("Installing packages...")
      //await webR.installPackages(["metafor"])

      //setStatus("Running R code...")
      //await readCSV(webR, "prepared-effects.csv")

      //await runMetaAnalysis(webR)

      setStatus("Ready")
    })()
  }, [])

  return (
    <div className="m-3">
      <div className="flex gap-3">
        <h1 className="text-4xl font-bold tracking-tight">Meata-Analysis</h1>
        <p className="my-3">Status: {status}</p>
      </div>
      <div className="flex flex-col-reverse md:flex-row items-start justify-center gap-3 border rounded-lg p-3">
        <ComboboxDemo />
        <ForestPlot />
      </div>
    </div>
  )
}

export default App
