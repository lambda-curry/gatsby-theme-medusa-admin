import clsx from "clsx"
import {
  useAdminCreateClaim,
  useAdminCreateNote,
  useAdminCreateSwap,
  useAdminOrder,
} from "medusa-react"
import React, { useState } from "react"
import ClaimMenu from "../../../domain/orders/details/claim/create"
import ReturnMenu from "../../../domain/orders/details/returns"
import SwapMenu from "../../../domain/orders/details/swap/create"
import {
  ClaimEvent,
  ExchangeEvent,
  ItemsFulfilledEvent,
  ItemsShippedEvent,
  NoteEvent,
  NotificationEvent,
  OrderPlacedEvent,
  ReturnEvent,
  TimelineEvent,
  useBuildTimelime,
} from "../../../hooks/use-build-timeline"
import useNotification from "../../../hooks/use-notification"
import { getErrorMessage } from "../../../utils/error-messages"
import Spinner from "../../atoms/spinner"
import AlertIcon from "../../fundamentals/icons/alert-icon"
import BackIcon from "../../fundamentals/icons/back-icon"
import RefreshIcon from "../../fundamentals/icons/refresh-icon"
import Actionables, { ActionType } from "../../molecules/actionables"
import NoteInput from "../../molecules/note-input"
import Claim from "../../molecules/timeline-events/claim"
import Exchange from "../../molecules/timeline-events/exchange"
import ItemsFulfilled from "../../molecules/timeline-events/items-fulfilled"
import ItemsShipped from "../../molecules/timeline-events/items-shipped"
import Note from "../../molecules/timeline-events/note"
import Notification from "../../molecules/timeline-events/notification"
import OrderCanceled from "../../molecules/timeline-events/order-canceled"
import OrderPlaced from "../../molecules/timeline-events/order-placed"
import Return from "../../molecules/timeline-events/return"

type TimelineProps = {
  orderId: string
}

const Timeline: React.FC<TimelineProps> = ({ orderId }) => {
  const { events, refetch } = useBuildTimelime(orderId)
  const notification = useNotification()
  const createNote = useAdminCreateNote()
  const { order } = useAdminOrder(orderId)
  const [showRequestReturn, setShowRequestReturn] = useState(false)
  const [showCreateSwap, setshowCreateSwap] = useState(false)
  const [showCreateClaim, setshowCreateClaim] = useState(false)
  const createSwap = useAdminCreateSwap(orderId)
  const createClaim = useAdminCreateClaim(orderId)

  const actions: ActionType[] = [
    {
      icon: <BackIcon size={20} />,
      label: "Request Return",
      onClick: () => setShowRequestReturn(true),
    },
    {
      icon: <RefreshIcon size={20} />,
      label: "Register Exchange",
      onClick: () => setshowCreateSwap(true),
    },
    {
      icon: <AlertIcon size={20} />,
      label: "Register Claim",
      onClick: () => setshowCreateClaim(true),
    },
  ]

  const handleCreateNote = (value: string | undefined) => {
    if (!value) {
      return
    }
    createNote.mutate(
      {
        resource_id: orderId,
        resource_type: "order",
        value: value,
      },
      {
        onSuccess: () => notification("Success", "Added note", "success"),
        onError: (err) => notification("Error", getErrorMessage(err), "error"),
      }
    )
  }

  return (
    <>
      <div className="h-full w-5/12 rounded-rounded bg-grey-0 border border-grey-20">
        <div className="py-large px-xlarge border-b border-grey-20">
          <div className="flex items-center justify-between">
            <h3 className="inter-xlarge-semibold">Timeline</h3>
            <div
              className={clsx({
                "pointer-events-none opacity-50": !events,
              })}
            >
              <Actionables actions={actions} />
            </div>
          </div>
          <div
            className={clsx("mt-base", {
              "pointer-events-none opacity-50": !events,
            })}
          >
            <NoteInput onSubmit={handleCreateNote} />
          </div>
        </div>
        <div className="py-large px-xlarge">
          {!events ? (
            <div className="h-96 w-full flex items-center justify-center">
              <Spinner variant="secondary" size="large" />
            </div>
          ) : (
            <div className="flex flex-col gap-y-base">
              {events.map((event, i) => {
                return <div key={i}>{switchOnType(event, refetch)}</div>
              })}
            </div>
          )}
        </div>
      </div>
      {showRequestReturn && (
        <ReturnMenu
          order={order}
          notification={notification}
          onDismiss={() => setShowRequestReturn(false)}
        />
      )}
      {showCreateSwap && (
        <SwapMenu
          order={order}
          onCreate={createSwap.mutateAsync}
          notification={notification}
          onDismiss={() => setshowCreateSwap(false)}
        />
      )}
      {showCreateClaim && (
        <ClaimMenu
          order={order}
          onCreate={createClaim.mutateAsync}
          notification={notification}
          onDismiss={() => setshowCreateClaim(false)}
        />
      )}
    </>
  )
}

function switchOnType(event: TimelineEvent, refetch: () => void) {
  switch (event.type) {
    case "placed":
      return <OrderPlaced event={event as OrderPlacedEvent} />
    case "fulfilled":
      return <ItemsFulfilled event={event as ItemsFulfilledEvent} />
    case "note":
      return <Note event={event as NoteEvent} />
    case "shipped":
      return <ItemsShipped event={event as ItemsShippedEvent} />
    case "canceled":
      return <OrderCanceled event={event as TimelineEvent} />
    case "return":
      return <Return event={event as ReturnEvent} refetch={refetch} />
    case "exchange":
      return <Exchange event={event as ExchangeEvent} />
    case "claim":
      return <Claim event={event as ClaimEvent} />
    case "notification":
      return <Notification event={event as NotificationEvent} />
    default:
      return null
  }
}

export default Timeline
