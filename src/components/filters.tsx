"use client"

import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useEffect, useState } from "react"
import { WebR } from "webr"
import { jsonToDataframe, runMetaAnalysis } from "@/lib/r-functions"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterInput } from "./filters/input"
import { FilterSelectMultiple } from "./filters/select-multiple"

import data from "../assets/data/prepared-effects.json"

import {
  OUTCOMES_BEHAVIORS,
  OUTCOMES_INTENTIONS,
  OUTCOMES_ATTITUDES,
  INTERVENTION_ASPECTS,
  INTERVENTION_MEDIA,
  INTERVENTION_APPEALS,
  COUNTRIES,
} from "@/lib/constants"
import { selectOptions } from "@/lib/utils"

// Outcome options
const outcomesBehaviorOptions = selectOptions(
  OUTCOMES_BEHAVIORS,
  OUTCOMES_BEHAVIORS.filter((e) => e !== "Vegetarian sales"),
)
const outcomesIntentionsOptions = selectOptions(OUTCOMES_INTENTIONS, [])
const outcomesAttitudesOptions = selectOptions(OUTCOMES_ATTITUDES, [])
const outcomesOptions = outcomesBehaviorOptions.concat(
  outcomesIntentionsOptions,
  outcomesAttitudesOptions,
)

// Intervention options
const interventionAspectsOptions = selectOptions(
  INTERVENTION_ASPECTS,
  INTERVENTION_ASPECTS,
)
const interventionMediaOptions = selectOptions(
  INTERVENTION_MEDIA,
  INTERVENTION_MEDIA,
)
const interventionAppealsOptions = selectOptions(
  INTERVENTION_APPEALS,
  INTERVENTION_APPEALS,
)

// Country
const countriesOptions = selectOptions(COUNTRIES, COUNTRIES)

const formSchema = z.object({
  outcomes: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one outcome" }),
  interventionAspect: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention aspect" }),
  interventionMedium: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention medium" }),
  interventionAppeal: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one intervention appeal" }),
  countries: z
    .string()
    .array()
    .nonempty({ message: "Must select at least one country" }),
  minimumCellSize: z.coerce.number().min(1).max(1000),
})

type FiltersProps = {
  setData: Function
  setEffect: Function
  status: string
  setStatus: Function
}

export const Filters = (props: FiltersProps) => {
  const { setData, setEffect, status, setStatus } = props

  const [open, setOpen] = useState(false)
  const [ranOnce, setRanOnce] = useState(false)
  const [disabled, setDisabled] = useState(true)
  const [error, setError] = useState(false)
  const [webR, setWebR] = useState<WebR>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcomes: outcomesOptions.filter((e) => e.checked).map((e) => e.label),
      interventionAspect: interventionAspectsOptions
        .filter((e) => e.checked)
        .map((e) => e.label),
      interventionMedium: interventionMediaOptions
        .filter((e) => e.checked)
        .map((e) => e.label),
      interventionAppeal: interventionAppealsOptions
        .filter((e) => e.checked)
        .map((e) => e.label),
      countries: countriesOptions.filter((e) => e.checked).map((e) => e.label),
      minimumCellSize: 1,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let subset: typeof data

    const selectedSubCategories = values.outcomes.map((e: string) =>
      e.toLowerCase(),
    )

    // Filter on outcome
    subset = data.filter((e) =>
      selectedSubCategories.includes(e.outcome_subcategory),
    )

    // Filter on cell size
    subset = subset.filter(
      (e) =>
        e.control_n > values.minimumCellSize &&
        e.intervention_n > values.minimumCellSize,
    )

    // Filter on intervention aspect
    subset = subset.filter((e) => {
      return values.interventionAspect.some((aspect) =>
        e.intervention_aspect.includes(aspect.toLowerCase()),
      )
    })

    subset = subset.filter((e) => {
      return values.interventionMedium.some((medium) =>
        e.intervention_medium.includes(medium.toLowerCase()),
      )
    })

    subset = subset.filter((e) => {
      return values.interventionAppeal.some((appeal) =>
        e.intervention_appeal.includes(appeal.toLowerCase()),
      )
    })

    // Filter on country
    subset = subset.filter((e) =>
      values.countries.includes(e.control_sample_country),
    )
    subset = subset.filter((e) =>
      values.countries.includes(e.intervention_sample_country),
    )

    if (subset.length == 0) {
      setError(true)
    } else {
      setError(false)
      setData(subset)

      console.log(subset)

      setStatus("Running meta-analysis...")
      setDisabled(true)
      await jsonToDataframe(webR, subset, "data")
      const results = await runMetaAnalysis(webR)
      setEffect({ value: results[0], lower: results[1], upper: results[2] })

      setStatus("Ready")
      setDisabled(false)
    }
  }

  useEffect(() => {
    const initializeR = async () => {
      const newWebR = new WebR({ channelType: 1 })
      setWebR(newWebR)

      await newWebR.init()

      setStatus("Installing packages...")
      await newWebR.installPackages(["metafor"])

      setStatus("Ready")
    }
    initializeR()

    form.handleSubmit(onSubmit)
  }, [])

  useEffect(() => {
    if (status == "Ready") {
      if (!ranOnce) {
        form.handleSubmit(onSubmit)()
      }
      setRanOnce(true)
      setDisabled(false)
    }
  }, [status])

  return (
    <Collapsible
      className=" rounded-lg bg-gray-100 p-3"
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger>
        <div className="m-1 flex flex-row items-center gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Filters</h2>
          <ChevronRight
            className={cn("transition", open ? "rotate-90" : "rotate-0")}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="CollapsibleContent">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="m-1 space-y-8"
          >
            <div>
              <h3 className="text-xl font-semibold">Outcomes</h3>
              <FilterSelectMultiple
                form={form}
                name="outcomes"
                groups={[
                  {
                    label: "Behavioral outcomes",
                    items: outcomesBehaviorOptions,
                  },
                  {
                    label: "Intentions outcomes",
                    items: outcomesIntentionsOptions,
                  },
                  {
                    label: "Attitudinal outcomes",
                    items: outcomesAttitudesOptions,
                  },
                ]}
              />
            </div>
            <div>
              <div>
                <h3 className="text-xl font-semibold">Interventions</h3>
              </div>
              <div className="flex gap-3">
                <FilterSelectMultiple
                  form={form}
                  name="interventionAspect"
                  groups={[
                    {
                      label: "Intervention aspect",
                      items: interventionAspectsOptions,
                    },
                  ]}
                />
                <FilterSelectMultiple
                  form={form}
                  name="interventionMedium"
                  groups={[
                    {
                      label: "Intervention medium",
                      items: interventionMediaOptions,
                    },
                  ]}
                />
                <FilterSelectMultiple
                  form={form}
                  name="interventionAppeal"
                  groups={[
                    {
                      label: "Intervention appeal",
                      items: interventionAppealsOptions,
                    },
                  ]}
                />
              </div>
            </div>
            <div>
              <div>
                <h3 className="text-xl font-semibold">Samples</h3>
              </div>
              <div className="flex gap-3">
                <FilterSelectMultiple
                  form={form}
                  name="countries"
                  groups={[
                    {
                      label: "Country",
                      items: countriesOptions,
                    },
                  ]}
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
