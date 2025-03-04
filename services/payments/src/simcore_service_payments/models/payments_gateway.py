from datetime import datetime
from pathlib import Path
from typing import Literal

from models_library.api_schemas_webserver.wallets import PaymentID, PaymentMethodID
from models_library.basic_types import AmountDecimal, IDStr
from pydantic import BaseModel, EmailStr, Extra, Field


class ErrorModel(BaseModel):
    message: str
    exception: str | None = None
    file: Path | str | None = None
    line: int | None = None
    trace: list | None = None


class InitPayment(BaseModel):
    amount_dollars: AmountDecimal
    # metadata to store for billing or reference
    credits_: AmountDecimal = Field(..., alias="credits")
    user_name: IDStr
    user_email: EmailStr
    wallet_name: IDStr

    class Config:
        extra = Extra.forbid


class PaymentInitiated(BaseModel):
    payment_id: PaymentID


class PaymentCancelled(BaseModel):
    message: str | None = None


class InitPaymentMethod(BaseModel):
    method: Literal["CC"] = "CC"
    # metadata to store for billing or reference
    user_name: IDStr
    user_email: EmailStr
    wallet_name: IDStr

    class Config:
        extra = Extra.forbid


class PaymentMethodInitiated(BaseModel):
    payment_method_id: PaymentMethodID


class GetPaymentMethod(BaseModel):
    id: PaymentMethodID
    card_holder_name: str | None = None
    card_number_masked: str | None = None
    card_type: str | None = None
    expiration_month: int | None = None
    expiration_year: int | None = None
    created: datetime


class BatchGetPaymentMethods(BaseModel):
    payment_methods_ids: list[PaymentMethodID]


class PaymentMethodsBatch(BaseModel):
    items: list[GetPaymentMethod]
