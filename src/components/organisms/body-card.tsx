import clsx from "clsx"
import React from "react"
import { useScroll } from "../../hooks/use-scroll"
import Button from "../fundamentals/button"
import Actionables, { ActionType } from "../molecules/actionables"

type BodyCardProps = {
  title?: string | JSX.Element | React.ReactNode
  subtitle?: string
  events?: {
    label: string
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"]
  }[]
  actionables?: ActionType[]
  forceDropdown?: boolean
  customActionable?: React.ReactNode
  status?: React.ReactNode
  customHeader?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

const BodyCard: React.FC<BodyCardProps> = ({
  title,
  subtitle,
  events,
  actionables,
  forceDropdown = false,
  customActionable,
  status,
  customHeader,
  className,
  children,
  ...rest
}) => {
  const { isScrolled, scrollListener } = useScroll({ threshold: 16 })
  return (
    <div
      className={clsx(
        "rounded-rounded border bg-grey-0 border-grey-20 h-full overflow-hidden flex flex-col min-h-[350px] w-full relative",
        className
      )}
      {...rest}
    >
      {isScrolled && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-grey-0 to-transparent h-xlarge z-10" />
      )}
      <div
        className="pt-medium px-xlarge flex flex-col grow overflow-y-auto"
        onScroll={scrollListener}
      >
        <div className="flex items-center justify-between mt-6 h-xlarge">
          {customHeader ? (
            <div>{customHeader}</div>
          ) : title ? (
            <h1 className="inter-xlarge-semibold text-grey-90">{title}</h1>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            {status && status}
            <Actionables
              actions={actionables}
              forceDropdown={forceDropdown}
              customTrigger={customActionable}
            />
          </div>
        </div>
        {subtitle && (
          <h3 className="inter-small-regular pt-1.5 text-grey-50">
            {subtitle}
          </h3>
        )}
        <div className="flex flex-col grow my-large">{children}</div>
      </div>
      {events && events.length > 0 ? (
        <div className="pb-large pt-base px-xlarge border-t border-grey-20">
          <div className="flex items-center flex-row-reverse">
            {events.map((event, i: React.Key) => {
              return (
                <Button
                  key={i}
                  onClick={event.onClick}
                  className="first:ml-xsmall min-w-[130px] justify-center"
                  variant={i === 0 ? "primary" : "ghost"}
                  size={"small"}
                  type={event.type}
                >
                  {event.label}
                </Button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-[24px]" />
      )}
    </div>
  )
}

export default BodyCard
