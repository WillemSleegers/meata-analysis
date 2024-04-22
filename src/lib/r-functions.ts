import { WebR } from "webr"

export async function readCSV(webR: any, file: string) {
  await webR.objs.globalEnv.bind("file", "http://localhost:5173/" + file)
  await webR.evalR("data <- read.csv(file)")
}

export async function runMetaAnalysis(webR: any) {
  const result = await webR.evalRRaw(
    `
          V <- metafor::vcalc(
              vi = effect_size_var,
              cluster = paper_study,
              subgroup = outcome,
              data = data,
              grp1 = group_1,
              grp2 = group_2
            )
          res <- metafor::rma.mv(effect_size_value, V, random = ~ 1 | paper_study/outcome, data = data)
          c(res$beta, res$ci.lb, res$ci.ub)
          `,
    "number[]",
  )
  return result
}

export async function jsonToDataframe(
  webR: any,
  json: unknown,
  globalVarName = "",
) {
  if (!globalVarName) {
    globalVarName = "dataVar_" + makeid(10)
  }
  if (!json)
    throw new Error(
      "No input data provided. Input data has to be an array of objects.",
    )
  if (
    Array.isArray(json) &&
    typeof json === "object" &&
    !Array.isArray(json[0])
  ) {
    // valid input
    for (const [index, key] of Object.keys(json[0]).entries()) {
      // create a column vector
      let col = json.map((row) => row[key]) as any
      // infer the data type from the first elem of the column
      if (typeof col[0] === "number") {
        col = await new webR.RDouble(col)
      } else if (typeof col[0] === "string") {
        col = await new webR.RCharacter(col)
      } else {
        throw new Error(
          "Unsupported data type in input data to jsonToDataframe: ",
          col[0],
        )
      }
      await webR.objs.globalEnv.bind(`v_${index}`, col)
    }
    // create df from column variables
    await webR.evalR(
      `${globalVarName} <- data.frame(${Object.keys(json[0])
        .map((_, index) => `v_${index}`)
        .join()})
       colnames(${globalVarName}) <- c(${Object.keys(json[0])
         .map((colName) => "'" + colName + "'")
         .join(",")})
      `,
    )
    return globalVarName
  } else {
    throw new Error("Invalid input. Input data has to be an array of objects.")
  }

  function makeid(length: number) {
    let result = ""
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    let counter = 0
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
      counter += 1
    }
    return result
  }
}
