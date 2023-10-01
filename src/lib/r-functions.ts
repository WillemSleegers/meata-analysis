export async function getRandomNumbers(webR: any) {
  const result = await webR.evalR("rnorm(20,10,10)")
  try {
    return await result.toArray()
  } finally {
    webR.destroy(result)
  }
}

export async function readCSV(webR: any, file: string) {
  await webR.objs.globalEnv.bind("file", "http://localhost:5173/" + file)
  await webR.evalR("data <- read.csv(file)")
}

export async function runMetaAnalysis(webR: any) {
  const result = await webR.evalRRaw(
    `
        V <- metafor::vcalc(
            vi = effect_size_var,
            cluster = cluster,
            subgroup = outcome,
            data = data,
            grp1 = group_1,
            grp2 = group_2
          )
        res <- metafor::rma.mv(yi, V, random = ~ 1 | cluster, data = data)
        c(res$beta, res$ci.lb, res$ci.ub)
        `,
    "number[]"
  )
  return result
}
