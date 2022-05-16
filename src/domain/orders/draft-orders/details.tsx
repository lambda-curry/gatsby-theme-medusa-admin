import { Address, AdminDraftOrdersRes, DraftOrder } from "@medusajs/medusa"
import moment from "moment"
import { navigate } from "gatsby"
import {
  useAdminDeleteDraftOrder,
  useAdminDiscounts,
  useAdminDraftOrder,
  useAdminDraftOrderRegisterPayment,
  useAdminStore,
  useAdminUpdateDraftOrder,
} from "medusa-react"
import React, { useEffect, useState } from "react"
import ReactJson from "react-json-view"
import Avatar from "../../../components/atoms/avatar"
import Spinner from "../../../components/atoms/spinner"
import Badge from "../../../components/fundamentals/badge"
import Button from "../../../components/fundamentals/button"
import DetailsIcon from "../../../components/fundamentals/details-icon"
import DollarSignIcon from "../../../components/fundamentals/icons/dollar-sign-icon"
import ImagePlaceholderIcon from "../../../components/fundamentals/icons/image-placeholder-icon"
import TruckIcon from "../../../components/fundamentals/icons/truck-icon"
import StatusDot from "../../../components/fundamentals/status-indicator"
import Breadcrumb from "../../../components/molecules/breadcrumb"
import BodyCard from "../../../components/organisms/body-card"
import DeletePrompt from "../../../components/organisms/delete-prompt"
import useNotification from "../../../hooks/use-notification"
import { getErrorMessage } from "../../../utils/error-messages"
import { formatAmountWithSymbol } from "../../../utils/prices"
import AddressModal from "../details/address-modal"
import { DisplayTotal, FormattedAddress } from "../details/templates"
import CopyToClipboard from "../../../components/atoms/copy-to-clipboard"
import medusaApi from "../../../services/api"
import { queryClient } from "../../../services/config"
import { DiscountModal } from "../../../components/discount-modal/DiscountModal"

export interface DiscountOption {
  label: string
  value: string | null
  disabled?: boolean | undefined
}

export interface AddDiscountCodeInput {
  code: { value: string }
}

const DraftOrderDetails = ({ id }) => {
  type DeletePromptData = {
    resource: string
    onDelete: () => any
    show: boolean
  }

  const initDeleteState: DeletePromptData = {
    resource: "",
    onDelete: () => Promise.resolve(console.log("Delete resource")),
    show: false,
  }

  const [discountOptions, setDiscountOptions] = useState<DiscountOption[]>([])
  const [paymentLink, setPaymentLink] = useState("")
  const [discountModalIsOpen, setDiscountModalIsOpen] = useState(false)
  const [deletePromptData, setDeletePromptData] = useState<DeletePromptData>(
    initDeleteState
  )

  const [addressModal, setAddressModal] = useState<null | {
    address: Address
    type: "billing" | "shipping"
  }>(null)

  const { discounts } = useAdminDiscounts()
  const { mutate: updateDraftOrder } = useAdminUpdateDraftOrder(id)
  const { draft_order, isLoading } = useAdminDraftOrder(id)
  const { store, isLoading: isLoadingStore } = useAdminStore()
  const markPaid = useAdminDraftOrderRegisterPayment(id)
  const cancelOrder = useAdminDeleteDraftOrder(id)
  const updateOrder = useAdminUpdateDraftOrder(id)
  const notification = useNotification()

  useEffect(() => {
    if (store && draft_order && store.payment_link_template) {
      console.log(store.payment_link_template)
      setPaymentLink(
        store.payment_link_template.replace(/\{cart_id\}/, draft_order.cart_id)
      )
    }
  }, [isLoading, isLoadingStore])

  useEffect(() => {
    if (!discounts) return

    const options = discounts.map((discount) => ({
      label: discount.code,
      value: discount.code,
      disabled: discount.is_disabled,
    }))

    setDiscountOptions(options)
  }, discounts)

  const OrderStatusComponent = () => {
    switch (draft_order?.status) {
      case "completed":
        return <StatusDot title="Completed" variant="success" />
      case "open":
        return <StatusDot title="Open" variant="default" />
      default:
        return null
    }
  }

  const PaymentActionables = () => {
    // Default label and action
    const label = "Mark as paid"
    const action = () => {
      markPaid.mutate(void {}, {
        onSuccess: () =>
          notification("Success", "Successfully mark as paid", "success"),
        onError: (err) => notification("Error", getErrorMessage(err), "error"),
      })
    }

    return (
      <Button variant="secondary" size="small" onClick={action}>
        {label}
      </Button>
    )
  }

  const handleDeleteOrder = async () => {
    return cancelOrder.mutate(void {}, {
      onSuccess: () =>
        notification("Success", "Successfully canceled order", "success"),
      onError: (err) => notification("Error", getErrorMessage(err), "error"),
    })
  }

  const handleUpdateAddress = async ({ data, type }) => {
    const { email, ...rest } = data

    const updateObj = {}

    if (type === "shipping") {
      updateObj["shipping_address"] = {
        ...rest,
      }
    } else {
      updateObj["billing_address"] = {
        ...rest,
      }
    }

    if (email) {
      updateObj["email"] = email
    }

    return updateOrder.mutate(updateObj, {
      onSuccess: () => {
        notification("Success", "Successfully updated address", "success")
        setAddressModal(null)
      },
      onError: (err) => notification("Error", getErrorMessage(err), "error"),
    })
  }

  const handleAddDiscount = (data: AddDiscountCodeInput) => {
    const discount = discounts?.find(
      (discount) => discount.code === data.code.value
    )

    if (!discount) throw new Error("That discount doesn't exist.")

    const { code } = discount

    updateDraftOrder(
      { discounts: [{ code }] },
      { onSuccess: () => setDiscountModalIsOpen(false) }
    )
  }

  const handleRemoveDiscount = async (code: string) => {
    const res = await medusaApi.draftOrders.removeDiscountFromDraftOrder(id, {
      code,
    })

    queryClient.setQueryData(["admin_draft_orders", "detail", id], {
      draft_order: res.data.draft_order,
    })
  }

  const { cart } = draft_order || {}
  const { region } = cart || {}

  return (
    <div>
      <Breadcrumb
        currentPage={"Draft Order Details"}
        previousBreadcrumb={"Draft Orders"}
        previousRoute="/a/draft-orders"
      />
      {isLoading || !draft_order ? (
        <BodyCard className="w-full pt-2xlarge flex items-center justify-center">
          <Spinner size={"large"} variant={"secondary"} />
        </BodyCard>
      ) : (
        <div className="flex space-x-4">
          <div className="flex flex-col w-full h-full">
            <BodyCard
              className={"w-full mb-4 min-h-[200px]"}
              title={`Order #${draft_order.display_id}`}
              subtitle={moment(draft_order.created_at).format(
                "D MMMM YYYY hh:mm a"
              )}
              status={<OrderStatusComponent />}
              customActionable={
                draft_order?.status === "completed" && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      navigate(`/a/orders/${draft_order.order_id}}`)
                    }
                  >
                    Go to Order
                  </Button>
                )
              }
              forceDropdown={draft_order?.status === "completed" ? false : true}
              actionables={
                draft_order?.status === "completed"
                  ? [
                      {
                        label: "Go to Order",
                        icon: null,
                        onClick: () => console.log("Should not be here"),
                      },
                    ]
                  : [
                      {
                        label: "Cancel Draft Order",
                        icon: null,
                        // icon: <CancelIcon size={"20"} />,
                        variant: "danger",
                        onClick: () =>
                          setDeletePromptData({
                            resource: "Draft Order",
                            onDelete: () => handleDeleteOrder(),
                            show: true,
                          }),
                      },
                    ]
              }
            >
              <div className="flex mt-6 space-x-6 divide-x">
                <div className="flex flex-col">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    Email
                  </div>

                  <div>{cart?.email}</div>
                </div>

                <div className="flex flex-col pl-6">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    Phone
                  </div>
                  <div>{cart?.shipping_address?.phone || ""}</div>
                </div>

                <div className="flex flex-col pl-6">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    Amount ({region?.currency_code.toUpperCase()})
                  </div>

                  <div>
                    {!!cart?.total &&
                      !!region?.currency_code &&
                      formatAmountWithSymbol({
                        amount: cart?.total,
                        currency: region?.currency_code,
                      })}
                  </div>
                </div>
              </div>
            </BodyCard>

            <BodyCard
              className={"w-full mb-4 min-h-0 h-auto"}
              title="Summary"
              customActionable={
                <>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setDiscountModalIsOpen(true)}
                  >
                    Add Discount
                  </Button>
                </>
              }
            >
              <div className="mt-6">
                {cart?.items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between mb-1 h-[64px] py-2 mx-[-5px] px-[5px] hover:bg-grey-5 rounded-rounded"
                  >
                    <div className="flex space-x-4 justify-center">
                      <div className="flex h-[48px] w-[36px] rounded-rounded bg-grey-10 items-center justify-center">
                        {item?.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            className="rounded-rounded object-cover"
                          />
                        ) : (
                          <div className="text-grey-30">
                            <ImagePlaceholderIcon />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="inter-small-regular text-grey-90 max-w-[225px] truncate">
                          {item.title}
                        </span>
                        {item?.variant && (
                          <span className="inter-small-regular text-grey-50">
                            {item.variant.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex  items-center">
                      <div className="flex small:space-x-2 medium:space-x-4 large:space-x-6 mr-3">
                        <div className="inter-small-regular text-grey-50">
                          {!!region?.currency_code &&
                            formatAmountWithSymbol({
                              amount: item.unit_price,
                              currency: region.currency_code,
                              digits: 2,
                              tax: region?.tax_rate,
                            })}
                        </div>
                        <div className="inter-small-regular text-grey-50">
                          x {item.quantity}
                        </div>
                        <div className="inter-small-regular text-grey-90">
                          {!!region?.currency_code &&
                            formatAmountWithSymbol({
                              amount: item.unit_price * item.quantity,
                              currency: region?.currency_code,
                              digits: 2,
                              tax: region?.tax_rate,
                            })}
                        </div>
                      </div>
                      <div className="inter-small-regular text-grey-50">
                        {region?.currency_code.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}

                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={draft_order?.cart?.subtotal}
                  totalTitle={"Subtotal"}
                />

                {cart?.discounts?.map((discount, index) => (
                  <div
                    key={index}
                    className="flex justify-between mt-4 items-center"
                  >
                    <div className="flex inter-small-regular text-grey-90 items-center">
                      Discount:{" "}
                      <Badge
                        className="flex items-center ml-3 pr-[2px]"
                        variant="default"
                      >
                        {discount.code}
                        <Button
                          className="h-6 ml-1 p-2"
                          onClick={() => handleRemoveDiscount(discount.code)}
                          size="small"
                          variant="ghost"
                        >
                          ✖
                        </Button>
                      </Badge>
                    </div>
                    <div className="inter-small-regular text-grey-90">
                      -
                      {!!cart.discount_total &&
                        formatAmountWithSymbol({
                          amount: cart.discount_total,
                          currency: region?.currency_code || "",
                          digits: 2,
                          tax: region?.tax_rate,
                        })}
                    </div>
                  </div>
                ))}

                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.shipping_total}
                  totalTitle={"Shipping"}
                />

                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.tax_total}
                  totalTitle={`Tax`}
                />

                <DisplayTotal
                  currency={region?.currency_code}
                  variant="large"
                  totalAmount={cart?.total}
                  totalTitle={`Total`}
                />
              </div>
            </BodyCard>

            <BodyCard
              className={"w-full mb-4 min-h-0 h-auto"}
              title="Payment"
              customActionable={
                draft_order?.status !== "completed" && <PaymentActionables />
              }
            >
              <div className="mt-6">
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.subtotal}
                  totalTitle={"Subtotal"}
                />
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.shipping_total}
                  totalTitle={"Shipping"}
                />
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.tax_total}
                  totalTitle={"Tax"}
                />
                <DisplayTotal
                  variant="bold"
                  currency={region?.currency_code}
                  totalAmount={cart?.total}
                  totalTitle={"Total to pay"}
                />
                {draft_order?.status !== "completed" && (
                  <div className="text-grey-50 inter-small-regular w-full flex items-center mt-5">
                    <span className="mr-2.5">Payment link:</span>
                    {store?.payment_link_template ? (
                      <CopyToClipboard
                        value={paymentLink}
                        displayValue={draft_order.cart_id}
                        successDuration={1000}
                      />
                    ) : (
                      "Configure payment link in store settings"
                    )}
                  </div>
                )}
              </div>
            </BodyCard>

            <BodyCard className={"w-full mb-4 min-h-0 h-auto"} title="Shipping">
              <div className="mt-6">
                {cart?.shipping_methods.map((method) => (
                  <div className="flex flex-col">
                    <span className="inter-small-regular text-grey-50">
                      Shipping Method
                    </span>
                    <span className="inter-small-regular text-grey-90 mt-2">
                      {method?.shipping_option.name || ""}
                    </span>
                    <div className="flex flex-col min-h-[100px] mt-8 bg-grey-5 px-3 py-2 h-full">
                      <span className="inter-base-semibold">
                        Data{" "}
                        <span className="text-grey-50 inter-base-regular">
                          (1 item)
                        </span>
                      </span>
                      <div className="flex flex-grow items-center mt-4">
                        <ReactJson
                          name={false}
                          collapsed={true}
                          src={method?.data}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BodyCard>

            <BodyCard
              className={"w-full mb-4 min-h-0 h-auto"}
              title="Customer"
              actionables={[
                {
                  label: "Edit Shipping Address",
                  icon: <TruckIcon size={"20"} />,
                  onClick: () =>
                    !!cart?.shipping_address &&
                    setAddressModal({
                      address: cart.shipping_address,
                      type: "shipping",
                    }),
                },
                {
                  label: "Edit Billing Address",
                  icon: <DollarSignIcon size={"20"} />,
                  onClick: () => {
                    if (cart?.billing_address) {
                      setAddressModal({
                        address: cart?.billing_address,
                        type: "billing",
                      })
                    }
                  },
                },
                {
                  label: "Go to Customer",
                  icon: <DetailsIcon size={"20"} />, // TODO: Change to Contact icon
                  onClick: () => navigate(`/a/customers/${cart?.customer.id}`),
                },
              ]}
            >
              <div className="mt-6">
                <div className="flex w-full space-x-4 items-center">
                  <div className="flex w-[40px] h-[40px] ">
                    <Avatar
                      user={cart?.customer}
                      font="inter-large-semibold"
                      color="bg-fuschia-40"
                    />
                  </div>
                  <div>
                    <h1 className="inter-large-semibold text-grey-90">
                      {`${cart?.shipping_address?.first_name} ${cart?.shipping_address?.last_name}`}
                    </h1>
                    <span className="inter-small-regular text-grey-50">
                      {cart?.shipping_address?.city},{" "}
                      {cart?.shipping_address?.country_code}
                    </span>
                  </div>
                </div>
                <div className="flex mt-6 space-x-6 divide-x">
                  <div className="flex flex-col">
                    <div className="inter-small-regular text-grey-50 mb-1">
                      Contact
                    </div>
                    <div className="flex flex-col inter-small-regular">
                      <span>{cart?.email}</span>
                      <span>{cart?.shipping_address?.phone || ""}</span>
                    </div>
                  </div>
                  <FormattedAddress
                    title={"Shipping"}
                    addr={cart?.shipping_address}
                  />
                  <FormattedAddress
                    title={"Billing"}
                    addr={cart?.billing_address}
                  />
                </div>
              </div>
            </BodyCard>

            <BodyCard
              className={"w-full mb-4 min-h-0 h-auto"}
              title="Raw Draft Order"
            >
              <ReactJson
                style={{ marginTop: "15px" }}
                name={false}
                collapsed={true}
                src={draft_order!}
              />
            </BodyCard>
          </div>
        </div>
      )}

      {addressModal && (
        <AddressModal
          handleClose={() => setAddressModal(null)}
          handleSave={(obj) => handleUpdateAddress(obj)}
          address={addressModal.address}
          type={addressModal.type}
        />
      )}

      {discountModalIsOpen && (
        <DiscountModal
          discountOptions={discountOptions}
          handleClose={() => setDiscountModalIsOpen(false)}
          handleSave={handleAddDiscount}
        />
      )}

      {/* An attempt to make a reusable delete prompt, so we don't have to hold +10
      state variables for showing different prompts */}
      {deletePromptData.show && (
        <DeletePrompt
          text={"Are you sure?"}
          heading={`Remove ${deletePromptData?.resource}`}
          successText={`${
            deletePromptData?.resource || "Resource"
          } has been removed`}
          onDelete={() => deletePromptData.onDelete()}
          handleClose={() => setDeletePromptData(initDeleteState)}
        />
      )}
    </div>
  )
}

export default DraftOrderDetails
