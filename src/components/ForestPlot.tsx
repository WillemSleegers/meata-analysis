import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Scatter,
  ErrorBar,
  Tooltip,
} from "recharts"

export const ForestPlot = () => {
  return (
    <ResponsiveContainer height={500} width="100%">
      <ScatterChart
        data={[
          {
            name: "A",
            errorX: [0.5, 0.5],
            x: 0.2,
          },
          {
            name: "B",
            errorX: [-0.2, -0.4],
            x: -0.3,
          },
          {
            name: "C",
            errorX: [-0.25, -0.25],
            x: -0.5,
          },
        ]}
        margin={{
          bottom: 5,
          left: 20,
          right: 20,
          top: 5,
        }}
      >
        <CartesianGrid
          horizontalFill={[]}
          horizontalPoints={[]}
          verticalFill={[]}
          verticalPoints={[]}
        />
        <XAxis dataKey="x" type="number" domain={[-3, 3]} />
        <YAxis yAxisId="left" dataKey="name" type="category" />
        <YAxis
          yAxisId="right"
          dataKey="name"
          type="category"
          orientation="right"
        />
        <Tooltip />
        <Scatter shape="square" fill="black" yAxisId="left">
          <ErrorBar dataKey="errorX" direction="x" strokeWidth={2} width={0} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
