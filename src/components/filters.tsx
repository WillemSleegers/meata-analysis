"use client"

import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useEffect, useState } from "react"
import { WebR } from "webr"
import { runMetaAnalysis } from "@/lib/r-functions"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterInput } from "./filters/input"

import data from "../assets/data/prepared-effects.json"

import { getOptions } from "@/lib/json-functions"
import { MultiPillsForm } from "./form/multi-pills-form"

const behaviors = getOptions("behaviors")
const intentions = getOptions("intentions")
const attitudes = getOptions("attitudes")
const measurements = getOptions("outcome_measurement_type")
const aspects = getOptions("intervention_aspect")
const mediums = getOptions("intervention_medium")
const appeals = getOptions("intervention_appeal")
const countries = getOptions("intervention_sample_country")

const formSchema = z.object({
  outcomes: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one outcome." }),
  measurements: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one outcome measurement." }),
  aspects: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention aspect." }),
  mediums: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention medium." }),
  appeals: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention appeal." }),
  countries: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one country." }),
  minimumCellSize: z.coerce.number().min(1),
})

type FiltersProps = {
  webR?: WebR
  setData: Function
  setEffect: Function
  status: string
  setStatus: Function
}

export const Filters = (props: FiltersProps) => {
  const { webR, setData, setEffect, status, setStatus } = props

  const [open, setOpen] = useState(false)
  const [ranOnce, setRanOnce] = useState(false)
  const [disabled, setDisabled] = useState(true)
  const [error, setError] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcomes: ["meat consumption", "meat consumption intention"],
      measurements: ["survey"],
      aspects: ["animal welfare"],
      mediums: ["text"],
      appeals: ["factual"],
      countries: countries,
      minimumCellSize: 50,
    },
    mode: "onSubmit",
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submit")

    let subset: typeof data

    // Filter on outcome
    subset = data.filter((datum) =>
      values.outcomes.includes(datum.outcome_subcategory),
    )

    // Filter on outcome measurement
    subset = subset.filter((datum) => {
      return values.measurements.some((measurement) =>
        datum.outcome_measurement_type.includes(measurement.toLowerCase()),
      )
    })

    // Filter on cell size
    subset = subset.filter(
      (datum) =>
        datum.control_n > values.minimumCellSize &&
        datum.intervention_n > values.minimumCellSize,
    )

    // Filter on intervention aspect
    subset = subset.filter((datum) => {
      return values.aspects.some(
        (aspect) =>
          datum.intervention_aspect.includes(aspect.toLowerCase()) ||
          datum.intervention_aspect == "",
      )
    })

    subset = subset.filter((datum) => {
      return values.mediums.some(
        (medium) =>
          datum.intervention_medium.includes(medium.toLowerCase()) ||
          datum.intervention_medium == "",
      )
    })

    subset = subset.filter((datum) => {
      return values.appeals.some(
        (appeal) =>
          datum.intervention_appeal.includes(appeal.toLowerCase()) ||
          datum.intervention_appeal == "",
      )
    })

    // Filter on country (intervention sample only)
    subset = subset.filter((e) =>
      values.countries.includes(e.intervention_sample_country),
    )

    if (subset.length == 0) {
      setError(true)
    } else {
      setError(false)
      setData(subset)

      if (webR) {
        console.log("Running meta-analysis...")
        setStatus("Running meta-analysis...")
        setDisabled(true)

        const data = subset.map((e) =>
          (({
            effect_size_value,
            effect_size_var,
            paper_study,
            outcome,
            group_1,
            group_2,
          }) => ({
            effect_size_value,
            effect_size_var,
            paper_study,
            outcome,
            group_1,
            group_2,
          }))(e),
        )
        const df = await new webR.RObject(data)
        await webR.objs.globalEnv.bind("data", df)
        const results = await runMetaAnalysis(webR)
        setEffect({ value: results[0], lower: results[1], upper: results[2] })

        setStatus("Ready")
        setDisabled(false)
      }
    }
  }

  useEffect(() => {
    form.handleSubmit(onSubmit)
  }, [form, setStatus])

  useEffect(() => {
    if (status == "Ready") {
      if (!ranOnce) {
        form.handleSubmit(onSubmit)()
      }
      setRanOnce(true)
      setDisabled(false)
    }
  }, [status, form, ranOnce])

  return (
    <Collapsible
      className="rounded-lg bg-gray-100 p-3"
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger>
        <div className="m-1 flex flex-row items-center gap-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Inclusion criteria
          </h2>
          <ChevronRight
            className={cn("transition", open ? "rotate-90" : "rotate-0")}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="CollapsibleContent">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="m-1 mt-4 space-y-4"
          >
            <div>
              <h3 className="mb-3 text-xl font-semibold">Outcomes</h3>
              <FormField
                control={form.control}
                name="outcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <FormLabel className="text-base">
                          Behavior outcomes
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={behaviors} />
                        <FormLabel className="text-base">
                          Intention outcomes
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={intentions} />
                        <FormLabel className="text-base">
                          Attitude/belief outcomes
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={attitudes} />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <hr className="mb-3 mt-1" />
              <FormField
                control={form.control}
                name="measurements"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <FormLabel className="text-base">
                          Measurement type
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={measurements} />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <h3 className="mb-3 text-xl font-semibold">Interventions</h3>
              <FormField
                control={form.control}
                name="aspects"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <FormLabel className="text-base">
                          Intervention aspect
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={aspects} />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediums"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <FormLabel className="text-base">
                          Intervention medium
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={mediums} />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appeals"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <FormLabel className="text-base">
                          Intervention appeal
                        </FormLabel>
                        <FormDescription></FormDescription>
                        <MultiPillsForm field={field} options={appeals} />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <div>
                <h3 className="text-xl font-semibold">Samples</h3>
              </div>
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="countries"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <>
                          <FormLabel className="text-base">Country</FormLabel>
                          <FormDescription></FormDescription>
                          <MultiPillsForm field={field} options={countries} />
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FilterInput
              form={form}
              name="minimumCellSize"
              label="Minimum cell size"
              description="This is the minimum cell size in either the control or intervention condition."
              placeholder="1"
              type="number"
            />
            <FormField
              name="error"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={disabled}>
              Update
            </Button>
          </form>
        </Form>
        {error && (
          <div className="ms-1 mt-2 text-sm text-red-500">
            No papers match these criteria
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
